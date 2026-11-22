import { and, eq, inArray, sql } from 'drizzle-orm';
import { canAccessOwn, userOwned } from '../../access';
import { db } from '../../db';
import { dayStart } from '../../month';
import { cardAlerts, gmailConnections } from '../../db/schema';
import { batches } from '../ingest';
import { getImportFromDay } from '../settings';
import { errorDetail, freshToken, leaseFree } from '../sync-kit';
import { convertWaitingAlerts } from '../card-alerts';
import { gmailDataBaseUrl } from './env';
import { getAccessToken, refreshConnection } from './oauth';
import { obj } from '../json';
import { ALERT_SENDERS, parseAlert } from './alert-parsers';

/** Refresh the access token when it expires within this window (Google's last an hour). */
const REFRESH_WINDOW_MS = 5 * 60_000;
const HTTP_TIMEOUT_MS = 15_000;
/** Re-reads this much before the cursor: mail can land in the index slightly out of order. */
const OVERLAP_S = 60;
const MAX_PAGES = 50;

/** Stored in gmail_connections.last_error_code: a code only, never a message or payload. */
type GmailSyncError = 'reconnect' | 'network' | 'api' | 'parse';

/** What the inbox says after "No se pudo sincronizar Gmail" for each stored code. */
const GMAIL_ERROR_LABELS: Record<string, string> = {
	reconnect: 'hay que volver a vincular Gmail',
	network: 'sin conexión con Gmail',
	api: 'Gmail respondió con un error',
	parse: 'algún mail de alertas de tarjeta no se pudo leer'
};

/** The inbox label of a stored code (an unknown code shows as is). */
export const gmailErrorLabel = (code: string) => GMAIL_ERROR_LABELS[code] ?? code;

class SyncError extends Error {
	constructor(readonly code: GmailSyncError) {
		super(code);
	}
}

/** Takes the user's lease and returns the cursor (null until the first run); null when off or held. */
async function acquire(
	userId: string
): Promise<{ cursor: Date | null; coveredFrom: Date | null } | null> {
	try {
		const [lease] = await db
			.update(gmailConnections)
			.set({ syncRunningSince: sql`now()` })
			.where(
				and(
					canAccessOwn(userId, gmailConnections),
					eq(gmailConnections.needsReconnect, false),
					leaseFree(gmailConnections.syncRunningSince)
				)
			)
			.returning({
				cursor: gmailConnections.syncCursor,
				coveredFrom: gmailConnections.coveredFrom
			});
		return lease ? { cursor: lease.cursor, coveredFrom: lease.coveredFrom } : null;
	} catch (e) {
		console.error('gmail sync failed: db', errorDetail(e));
		return null;
	}
}

/** The access token, refreshed when it is about to expire; calls the API and retries once after a 401. */
async function gmailClient(userId: string) {
	const auth = await freshToken(userId, {
		getAccessToken,
		refreshConnection,
		windowMs: REFRESH_WINDOW_MS,
		fail: (code) => new SyncError(code)
	});
	let token = auth.token;
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
				token = await auth.refresh();
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

/** Ids of the matching messages newer than the bound (minus the overlap), and whether every page was listed. */
async function listMessageIds(api: (url: string) => Promise<unknown>, bound: Date) {
	const from = ALERT_SENDERS.join(' OR ');
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
	return { ids, complete: !pageToken };
}

/** Fetches and stores the alerts after the bound; returns how many messages were invalid, the newest date seen (at least `base`) and whether the listing was complete. */
async function pull(userId: string, bound: Date, base: Date) {
	const api = await gmailClient(userId);
	const { ids, complete } = await listMessageIds(api, bound);
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
		const result = parseAlert(message);
		if (result.status === 'invalid') invalid++;
		else if (result.status === 'ok') {
			await db
				.insert(cardAlerts)
				.values({ ...userOwned(userId), ...result.alert })
				.onConflictDoNothing({ target: [cardAlerts.userId, cardAlerts.gmailMessageId] });
		}
	}
	return { invalid, newest: new Date(newest), complete };
}

/**
 * Reads from the "Importar desde" day when it is earlier than `coveredFrom` (or nothing was read yet: a
 * backfill), else from the cursor, and turns the card purchase alerts into pending items. Never throws and
 * logs only codes: the mail itself is never stored or logged. The cursor is the forward cursor: it never moves
 * backwards (a backfill leaves it where it was) and also moves past messages that did not parse (visible as
 * the `parse` code). A complete backfill listing lowers `coveredFrom`; a failed or truncated one retries on
 * the next run. Moving the day later leaves `coveredFrom`: trimming deletes pending items only, card_alerts stay
 * and convertWaitingAlerts reconverts them if the day moves earlier again. Does not release the lease.
 */
async function execute(
	userId: string,
	cursor: Date | null,
	coveredFrom: Date | null
): Promise<void> {
	let code: GmailSyncError | null = null;
	let next = cursor;
	let covered: Date | null = null;
	try {
		const importDay = dayStart(await getImportFromDay(userId)) ?? new Date();
		const backfill = cursor === null || coveredFrom === null || importDay < coveredFrom;
		const bound = backfill ? importDay : cursor;
		const base = cursor ?? bound;
		const { invalid, newest, complete } = await pull(userId, bound, base);
		next = newest;
		if (backfill && complete) covered = bound;
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
				...((code === null || code === 'parse') && next ? { syncCursor: next } : {}),
				// PG least() ignores NULL, so a legacy row takes the bound.
				...((code === null || code === 'parse') && covered
					? {
							coveredFrom: sql`least(${gmailConnections.coveredFrom}, ${covered.toISOString()}::timestamptz)`
						}
					: {})
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
 * The one entry to a Gmail sync: takes the user's lease (null when Gmail is not linked, needs a reconnect, or
 * another sync holds it). `run` syncs once (it backfills from the "Importar desde" day when that is not
 * covered yet) and then releases the lease; it never throws. A caller that does not run must `release`.
 */
export async function acquireGmailSync(userId: string) {
	const lease = await acquire(userId);
	if (!lease) return null;
	return {
		run: async () => {
			await execute(userId, lease.cursor, lease.coveredFrom);
			await releaseLease(userId);
		},
		release: () => releaseLease(userId)
	};
}
