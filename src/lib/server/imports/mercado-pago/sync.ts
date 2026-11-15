import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { financialAccounts, mpConnections, mpSyncState } from '../../db/schema';
import { canAccessAccount, canAccessOwn } from '../../access';
import { autoApprovePending } from '../approve';
import { type ImportRow, ingestImportItems } from '../ingest';
import { SOURCE } from '../sources';
import { DAY_MS } from '#lib/dates.ts';
import { apiJson, type Auth, fail, type MpSyncError, obj, str } from './client';
import { getAccessToken, refreshConnection } from './oauth';
import { syncPayments } from './payments';
import { syncReport } from './report';
import { MP_CURRENCY } from './settings';

/** Refresh the token when it expires within this window (MP tokens last 180 days). */
const REFRESH_WINDOW_MS = 30 * DAY_MS;
/** A sync holds its lease this long without renewing it; a later one may take over. */
const LEASE_MINUTES = 15;
const LEASE_MS = LEASE_MINUTES * 60_000;

/** Whether a sync that took its lease at `since` is still running. */
export const leaseActive = (since: Date | null | undefined) =>
	!!since && Date.now() - since.getTime() < LEASE_MS;

type Lease = {
	userId: string;
	accountId: string;
	currency: string;
	syncedUntil: Date | null;
	floor: Date | null;
};

type Ingest = (rows: ImportRow[]) => Promise<number>;

/** Loads the user's usable connection with its account and takes the lease; null when off or held elsewhere. */
async function acquire(userId: string): Promise<Lease | null> {
	try {
		const [conn] = await db
			.select({
				accountId: financialAccounts.id,
				currency: financialAccounts.currency,
				floor: mpConnections.importFrom
			})
			.from(mpConnections)
			.innerJoin(financialAccounts, eq(financialAccounts.id, mpConnections.accountId))
			.where(
				and(
					canAccessOwn(userId, mpConnections),
					canAccessAccount(userId),
					eq(mpConnections.needsReconnect, false)
				)
			)
			.limit(1);
		if (!conn) return null;
		const { accountId } = conn;
		await db.insert(mpSyncState).values({ accountId }).onConflictDoNothing();
		const [lease] = await db
			.update(mpSyncState)
			.set({ runningSince: sql`now()`, phase: 'payments', newItems: null, autoApproved: null })
			.where(
				and(
					eq(mpSyncState.accountId, accountId),
					or(
						isNull(mpSyncState.runningSince),
						lt(
							mpSyncState.runningSince,
							sql`now() - interval '${sql.raw(String(LEASE_MINUTES))} minutes'`
						)
					)
				)
			)
			.returning({ syncedUntil: mpSyncState.syncedUntil });
		return lease
			? {
					userId,
					accountId,
					currency: conn.currency,
					syncedUntil: lease.syncedUntil,
					floor: conn.floor
				}
			: null;
	} catch {
		console.error('mp sync failed: network');
		return null;
	}
}

async function refreshed(userId: string): Promise<Auth> {
	const outcome = await refreshConnection(userId);
	if (outcome === 'reconnect') throw fail('reconnect');
	if (outcome === 'error') throw fail('network');
	const fresh = await getAccessToken(userId);
	if (!fresh) throw fail('reconnect');
	return { token: fresh.token };
}

async function currentAuth(userId: string): Promise<Auth> {
	const stored = await getAccessToken(userId);
	if (!stored) throw fail('reconnect');
	let auth: Auth = { token: stored.token };
	// Refresh ahead of expiry; if MP is unreachable the current token may still work.
	if (stored.expiresAt.getTime() < Date.now() + REFRESH_WINDOW_MS) {
		try {
			auth = await refreshed(userId);
		} catch (e) {
			if ((e as Error).message === 'reconnect' || stored.expiresAt.getTime() <= Date.now()) throw e;
		}
	}
	return auth;
}

/** The MP user id behind the token, with the token that worked. */
async function whoAmI(userId: string, auth: Auth): Promise<{ auth: Auth; me: string }> {
	let meJson: unknown;
	try {
		meJson = await apiJson('/users/me', auth);
	} catch (e) {
		// A 401 here means the token died early: refresh once and retry the run once.
		if ((e as Error).message !== 'auth') throw e;
		auth = await refreshed(userId);
		meJson = await apiJson('/users/me', auth);
	}
	const me = str(obj(meJson).id);
	if (!me) throw fail('parse');
	return { auth, me };
}

async function paymentsStep(
	l: Lease,
	me: string,
	auth: Auth,
	{ from, report }: { from?: Date; report: boolean },
	ingest: Ingest
): Promise<void> {
	const paid = await ingest(await syncPayments(l.accountId, l.userId, me, auth, l.floor, from));
	// Progress for the inbox: payments are stored, the report is next (if any).
	await db
		.update(mpSyncState)
		.set({ phase: report ? 'report' : 'payments', newItems: paid })
		.where(eq(mpSyncState.accountId, l.accountId));
}

async function reportStep(l: Lease, auth: Auth, from: Date | undefined, ingest: Ingest) {
	const r = await syncReport(l.accountId, l.syncedUntil, auth, l.floor, from);
	const added = await ingest(r.rows);
	await db
		.update(mpSyncState)
		.set({ newItems: sql`coalesce(${mpSyncState.newItems}, 0) + ${added}` })
		.where(eq(mpSyncState.accountId, l.accountId));
	return r.end;
}

async function release(
	l: Lease,
	ok: boolean,
	code: MpSyncError | null,
	end: Date | null,
	from: Date | undefined,
	autoApproved: number
): Promise<void> {
	try {
		await db
			.update(mpSyncState)
			.set(
				ok
					? {
							runningSince: null,
							phase: null,
							lastError: null,
							...(end && !from ? { syncedUntil: end } : {}),
							lastRunAt: sql`now()`,
							autoApproved
						}
					: { runningSince: null, phase: null, lastError: code, autoApproved }
			)
			.where(eq(mpSyncState.accountId, l.accountId));
	} catch {
		console.error('mp sync failed: network');
	}
}

/**
 * Runs payments, then (with `report`) the release report, under a held lease and releases it. Never throws.
 * synced_until is the report cursor: only a report run moves it, and a backfill (`from`, both windows start
 * there) leaves it alone. Each stored batch auto-approves what a rule recognizes (also after a failed run:
 * items stored earlier still count), so the inbox reads the count with 'Listo'.
 */
async function execute(l: Lease, { from, report }: { from?: Date; report: boolean }) {
	let ok = false;
	let end: Date | null = null;
	let code: MpSyncError | null = null;
	let autoApproved = 0;
	const ingest = async (rows: ImportRow[]) => {
		const r = await ingestImportItems(l.userId, SOURCE.mercadoPago, rows);
		autoApproved += r.autoApproved;
		return r.created;
	};
	try {
		if (l.currency !== MP_CURRENCY) throw fail('config');
		const { auth, me } = await whoAmI(l.userId, await currentAuth(l.userId));
		await paymentsStep(l, me, auth, { from, report }, ingest);
		if (report) end = await reportStep(l, auth, from, ingest);
		ok = true;
	} catch (e) {
		code = (e as { mp?: boolean }).mp ? ((e as Error).message as MpSyncError) : 'network';
		const { path, detail } = e as { path?: string; detail?: string };
		console.error(`mp sync failed: ${code}`, path ?? '', detail ?? '');
	}
	if (!ok) autoApproved += await autoApprovePending(l.userId);
	await release(l, ok, code, end, from, autoApproved);
}

export type MpSyncOptions = {
	/** Also pull the release report; a function decides from the account's report cursor. */
	report: boolean | ((syncedUntil: Date | null) => boolean);
	/** "Traer movimientos desde": both windows start here and synced_until stays as it is. */
	from?: Date;
	/** Return once the lease is held; the run continues while the inbox polls the progress. */
	background?: boolean;
};

/** Takes the user's lease (false when off or held elsewhere) and runs the sync; the scheduler waits for it. */
export async function runMpSync(userId: string, opts: MpSyncOptions): Promise<boolean> {
	const lease = await acquire(userId);
	if (!lease) return false;
	const report = typeof opts.report === 'function' ? opts.report(lease.syncedUntil) : opts.report;
	const run = execute(lease, { from: opts.from, report });
	if (opts.background) void run;
	else await run;
	return true;
}

export async function getSyncState(userId: string, accountId: string) {
	const [row] = await db
		.select({
			syncedUntil: mpSyncState.syncedUntil,
			runningSince: mpSyncState.runningSince,
			lastRunAt: mpSyncState.lastRunAt,
			lastError: mpSyncState.lastError,
			phase: mpSyncState.phase,
			newItems: mpSyncState.newItems,
			autoApproved: mpSyncState.autoApproved
		})
		.from(mpSyncState)
		.innerJoin(financialAccounts, eq(mpSyncState.accountId, financialAccounts.id))
		.where(and(eq(mpSyncState.accountId, accountId), canAccessAccount(userId)))
		.limit(1);
	return row ?? null;
}
