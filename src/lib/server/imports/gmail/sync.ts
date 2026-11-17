import { and, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { canAccessOwn, userOwned } from '../../access';
import { db } from '../../db';
import { pgErrorCode } from '../../db/errors';
import { dayStart } from '../../month';
import { cardAlerts, gmailConnections } from '../../db/schema';
import { batches } from '../ingest';
import { getImportFromDay } from '../settings';
import { convertWaitingAlerts } from './cards';
import { gmailDataBaseUrl } from './env';
import { getAccessToken, refreshConnection } from './oauth';
import { VISA_SENDERS, parseVisaAlert } from './visa-alert';

/** A sync holds its lease this long without renewing it; a later one may take over. */
const LEASE_MINUTES = 15;
/** Refresh the access token when it expires within this window (Google's last an hour). */
const REFRESH_WINDOW_MS = 5 * 60_000;
const HTTP_TIMEOUT_MS = 15_000;
/** Re-reads this much before the cursor: mail can land in the index slightly out of order. */
const OVERLAP_S = 60;
const MAX_PAGES = 50;

/** Stored in gmail_connections.last_error_code: a code only, never a message or payload. */
type GmailSyncError = 'reconnect' | 'network' | 'api' | 'parse';

class SyncError extends Error {
	constructor(readonly code: GmailSyncError) {
		super(code);
	}
}

/** Log-safe failure detail: PG error code or error name, never messages. */
const errorDetail = (e: unknown) => pgErrorCode(e) ?? (e as Error)?.name ?? 'unknown';

const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** Takes the user's lease and returns the cursor (null until the first run); null when off or held. */
async function acquire(userId: string): Promise<{ cursor: Date | null } | null> {
	try {
		const [lease] = await db
			.update(gmailConnections)
			.set({ syncRunningSince: sql`now()` })
			.where(
				and(
					canAccessOwn(userId, gmailConnections),
					eq(gmailConnections.needsReconnect, false),
					or(
						isNull(gmailConnections.syncRunningSince),
						lt(
							gmailConnections.syncRunningSince,
							sql`now() - interval '${sql.raw(String(LEASE_MINUTES))} minutes'`
						)
					)
				)
			)
			.returning({ cursor: gmailConnections.syncCursor });
		return lease ? { cursor: lease.cursor } : null;
	} catch (e) {
		console.error('gmail sync failed: db', errorDetail(e));
		return null;
	}
}

/** The access token, refreshed when it is about to expire; calls the API and retries once after a 401. */
async function gmailClient(userId: string) {
	const refresh = async () => {
		const outcome = await refreshConnection(userId);
		if (outcome === 'reconnect') throw new SyncError('reconnect');
		if (outcome === 'error') throw new SyncError('network');
		const fresh = await getAccessToken(userId);
		if (!fresh) throw new SyncError('reconnect');
		return fresh.token;
	};
	const stored = await getAccessToken(userId);
	if (!stored) throw new SyncError('reconnect');
	let token = stored.token;
	if (stored.expiresAt.getTime() < Date.now() + REFRESH_WINDOW_MS) {
		try {
			token = await refresh();
		} catch (e) {
			// Google unreachable: the current token may still work until it expires.
			if ((e as SyncError).code === 'reconnect' || stored.expiresAt.getTime() <= Date.now())
				throw e;
		}
	}
	const get = (url: string) =>
		fetch(url, {
			headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
			signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
		});
	/** The JSON answer, or null for a 404 (a message deleted meanwhile). */
	return async (url: string): Promise<unknown> => {
		let res: Response;
		try {
			res = await get(url);
			if (res.status === 401) {
				token = await refresh();
				res = await get(url);
			}
		} catch (e) {
			throw e instanceof SyncError ? e : new SyncError('network');
		}
		if (res.status === 404) return null;
		if (!res.ok) throw new SyncError('api');
		try {
			return await res.json();
		} catch {
			throw new SyncError('api');
		}
	};
}

/** Ids of the matching messages newer than the bound (minus the overlap), all pages. */
async function listMessageIds(api: (url: string) => Promise<unknown>, bound: Date) {
	const from = VISA_SENDERS.join(' OR ');
	const after = Math.floor(bound.getTime() / 1000) - OVERLAP_S;
	const ids: string[] = [];
	let pageToken: string | undefined;
	for (let page = 0; page < MAX_PAGES; page++) {
		const params = new URLSearchParams({ q: `from:(${from}) after:${after}`, maxResults: '100' });
		if (pageToken) params.set('pageToken', pageToken);
		const json = obj(await api(`${gmailDataBaseUrl()}/gmail/v1/users/me/messages?${params}`));
		const messages = Array.isArray(json.messages) ? json.messages : [];
		for (const m of messages) if (typeof obj(m).id === 'string') ids.push(obj(m).id as string);
		pageToken = typeof json.nextPageToken === 'string' ? json.nextPageToken : undefined;
		if (!pageToken) break;
	}
	return ids;
}

/** Fetches and stores the alerts after the bound; returns how many messages were invalid and the newest date seen (at least `base`). */
async function pull(userId: string, bound: Date, base: Date) {
	const api = await gmailClient(userId);
	const ids = await listMessageIds(api, bound);
	const known = new Set<string>();
	for (const batch of batches(ids)) {
		const rows = await db
			.select({ id: cardAlerts.gmailMessageId })
			.from(cardAlerts)
			.where(and(canAccessOwn(userId, cardAlerts), inArray(cardAlerts.gmailMessageId, batch)));
		for (const r of rows) known.add(r.id);
	}
	let invalid = 0;
	let newest = base.getTime();
	for (const id of ids.filter((i) => !known.has(i))) {
		const message = await api(
			`${gmailDataBaseUrl()}/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`
		);
		if (message === null) continue;
		newest = Math.max(newest, Number(obj(message).internalDate) || 0);
		const result = parseVisaAlert(message);
		if (result.status === 'invalid') invalid++;
		else if (result.status === 'ok') {
			await db
				.insert(cardAlerts)
				.values({ ...userOwned(userId), ...result.alert })
				.onConflictDoNothing({ target: [cardAlerts.userId, cardAlerts.gmailMessageId] });
		}
	}
	return { invalid, newest: new Date(newest) };
}

/**
 * Reads from `from` (else the cursor, else the "Importar desde" day) and turns the Visa purchase alerts into
 * pending items. Never throws and logs only codes: the mail itself is never stored or logged. The cursor is
 * the forward cursor: it never moves backwards (a backfill from an earlier `from` leaves it where it was)
 * and also moves past messages that did not parse (visible as the `parse` code). Does not release the lease.
 */
async function execute(userId: string, cursor: Date | null, from?: Date): Promise<void> {
	let code: GmailSyncError | null = null;
	let next = cursor;
	try {
		const bound = from ?? cursor ?? dayStart(await getImportFromDay(userId)) ?? new Date();
		const base = cursor ?? bound;
		const { invalid, newest } = await pull(userId, bound, base);
		next = newest;
		if (invalid > 0) code = 'parse';
	} catch (e) {
		code = e instanceof SyncError ? e.code : 'network';
		console.error(`gmail sync failed: ${code}`, e instanceof SyncError ? '' : errorDetail(e));
	}
	try {
		await convertWaitingAlerts(userId);
	} catch (e) {
		console.error('gmail sync failed: db', errorDetail(e));
	}
	try {
		await db
			.update(gmailConnections)
			.set({
				lastRunAt: sql`now()`,
				lastErrorCode: code,
				// A failed run leaves the cursor: stored alerts are deduplicated by message id.
				...((code === null || code === 'parse') && next ? { syncCursor: next } : {})
			})
			.where(canAccessOwn(userId, gmailConnections));
	} catch (e) {
		console.error('gmail sync failed: db', errorDetail(e));
	}
}

async function releaseLease(userId: string) {
	try {
		await db
			.update(gmailConnections)
			.set({ syncRunningSince: null })
			.where(canAccessOwn(userId, gmailConnections));
	} catch (e) {
		// A failed write leaves the lease set; it expires after LEASE_MINUTES.
		console.error('gmail sync failed: db', errorDetail(e));
	}
}

/**
 * Takes the user's lease (null when Gmail is not linked, needs a reconnect, or another sync holds it) so the
 * caller can `run` once, optionally from an earlier day (a backfill), then must `release`. `run` never throws.
 */
export async function acquireGmailSync(userId: string) {
	const lease = await acquire(userId);
	if (!lease) return null;
	return {
		run: (from?: Date) => execute(userId, lease.cursor, from),
		release: () => releaseLease(userId)
	};
}

/** Acquires the lease, runs one sync and releases it; false when Gmail is not linked, needs a reconnect, or another sync holds the lease. */
export async function runGmailSync(userId: string): Promise<boolean> {
	const lease = await acquireGmailSync(userId);
	if (!lease) return false;
	await lease.run();
	await lease.release();
	return true;
}

/** The last run of the user's connection: when it ended and its error code, or null when not linked. */
export async function gmailSyncState(userId: string) {
	const [row] = await db
		.select({
			lastRunAt: gmailConnections.lastRunAt,
			lastErrorCode: gmailConnections.lastErrorCode,
			runningSince: gmailConnections.syncRunningSince
		})
		.from(gmailConnections)
		.where(canAccessOwn(userId, gmailConnections))
		.limit(1);
	return row ?? null;
}
