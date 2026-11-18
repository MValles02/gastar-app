import { isNull, lt, or, sql, type AnyColumn } from 'drizzle-orm';
import { pgErrorCode } from '../db/errors';

// What the automatic syncs (Mercado Pago, Gmail) share: the DB lease, log-safe errors, the access token
// refresh and the scheduler loop.

/** A sync holds its lease this long without renewing it; a later one may take over. */
export const LEASE_MINUTES = 15;
const LEASE_MS = LEASE_MINUTES * 60_000;

/** First scheduled run after a start. */
export const START_DELAY_MS = 60_000;

export const leaseFree = (runningSince: AnyColumn) =>
	or(
		isNull(runningSince),
		lt(runningSince, sql`now() - interval '${sql.raw(String(LEASE_MINUTES))} minutes'`)
	);

export const leaseActive = (since: Date | null | undefined) =>
	!!since && Date.now() - since.getTime() < LEASE_MS;

/** Log-safe failure detail: PG error code or error name, never messages. */
export const errorDetail = (e: unknown) => pgErrorCode(e) ?? (e as Error)?.name ?? 'unknown';

type TokenSource = {
	getAccessToken: (userId: string) => Promise<{ token: string; expiresAt: Date } | null>;
	refreshConnection: (userId: string) => Promise<'ok' | 'reconnect' | 'error'>;
	/** Refresh ahead of expiry when the token expires within this window. */
	windowMs: number;
	/** The source's sync error for a code. */
	fail: (code: 'reconnect' | 'network') => Error;
};

/**
 * The user's access token, refreshed when it expires within `windowMs`, and `refresh` for a token that died
 * early (a 401). Throws `fail('reconnect')` when the link must be redone, `fail('network')` when the
 * provider is unreachable and the stored token already expired.
 */
export async function freshToken(
	userId: string,
	{ getAccessToken, refreshConnection, windowMs, fail }: TokenSource
): Promise<{ token: string; refresh: () => Promise<string> }> {
	const reconnects = new WeakSet<object>();
	const reconnect = () => {
		const e = fail('reconnect');
		reconnects.add(e);
		return e;
	};
	const refresh = async () => {
		const outcome = await refreshConnection(userId);
		if (outcome === 'reconnect') throw reconnect();
		if (outcome === 'error') throw fail('network');
		const fresh = await getAccessToken(userId);
		if (!fresh) throw reconnect();
		return fresh.token;
	};
	const stored = await getAccessToken(userId);
	if (!stored) throw fail('reconnect');
	let token = stored.token;
	if (stored.expiresAt.getTime() < Date.now() + windowMs) {
		try {
			token = await refresh();
		} catch (e) {
			// Provider unreachable: the current token may still work until it expires.
			if (reconnects.has(e as object) || stored.expiresAt.getTime() <= Date.now()) throw e;
		}
	}
	return { token, refresh };
}

/**
 * Runs `run` for every user `users` lists, one after another. Never throws; one user failing does not stop
 * the rest. Logs only `<tag> sync failed: <code>` with errorDetail.
 */
export async function runEach(
	users: () => Promise<string[]>,
	run: (userId: string) => Promise<unknown>,
	tag: string
): Promise<void> {
	let list: string[];
	try {
		list = await users();
	} catch (e) {
		console.error(`${tag} sync failed: db`, errorDetail(e));
		return;
	}
	for (const userId of list) {
		try {
			await run(userId);
		} catch (e) {
			console.error(`${tag} sync failed: network`, errorDetail(e));
		}
	}
}
