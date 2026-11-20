import { and, eq, sql } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { db } from '../../db';
import { financialAccounts, mpConnections, mpSyncState } from '../../db/schema';
import { canAccessAccount, canAccessOwn } from '../../access';
import { autoApprovePending } from '../approve';
import { type ImportRow, ingestImportItems } from '../ingest';
import { obj } from '../json';
import { getChosenImportFrom } from '../settings';
import { SOURCE } from '#lib/imports.ts';

import { errorDetail, freshToken, leaseFree } from '../sync-kit';
import { DAY_MS } from '#lib/dates.ts';
import { apiJson, type Auth, fail, isAuthError, mpCode, type MpSyncError, str } from './client';
import { getAccessToken, refreshConnection } from './oauth';
import { syncPayments } from './payments';
import { syncReport } from './report';
import { MP_CURRENCY } from './settings';

/** Refresh the token when it expires within this window (MP tokens last 180 days). */
const REFRESH_WINDOW_MS = 30 * DAY_MS;

type Lease = {
	userId: string;
	accountId: string;
	currency: string;
	syncedUntil: Date | null;
	coveredFrom: Date | null;
	floor: Date | null;
};

type Ingest = (rows: ImportRow[]) => Promise<number>;

/** The single writer of a run's progress and outcome to the account's mp_sync_state row. */
const progress = (accountId: string, patch: PgUpdateSetSource<typeof mpSyncState>) =>
	db.update(mpSyncState).set(patch).where(eq(mpSyncState.accountId, accountId));

/** Loads the user's usable connection with its account and takes the lease; null when off or held elsewhere. */
async function acquire(userId: string): Promise<Lease | null> {
	try {
		const [conn] = await db
			.select({
				accountId: financialAccounts.id,
				currency: financialAccounts.currency
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
			.where(and(eq(mpSyncState.accountId, accountId), leaseFree(mpSyncState.runningSince)))
			.returning({ syncedUntil: mpSyncState.syncedUntil, coveredFrom: mpSyncState.coveredFrom });
		return lease
			? {
					userId,
					accountId,
					currency: conn.currency,
					syncedUntil: lease.syncedUntil,
					coveredFrom: lease.coveredFrom,
					floor: await getChosenImportFrom(userId)
				}
			: null;
	} catch (e) {
		console.error('mp sync failed: db', errorDetail(e));
		return null;
	}
}

/** The user's token, refreshed ahead of expiry; if MP is unreachable the current token may still work. */
const currentToken = (userId: string) =>
	freshToken(userId, { getAccessToken, refreshConnection, windowMs: REFRESH_WINDOW_MS, fail });

/** The MP user id behind the token, with the token that worked. */
async function whoAmI(
	current: Awaited<ReturnType<typeof currentToken>>
): Promise<{ auth: Auth; me: string }> {
	let auth: Auth = { token: current.token };
	let meJson: unknown;
	try {
		meJson = await apiJson('/users/me', auth);
	} catch (e) {
		// A 401 here means the token died early: refresh once and retry the run once.
		if (!isAuthError(e)) throw e;
		auth = { token: await current.refresh() };
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
	await progress(l.accountId, { phase: report ? 'report' : 'payments', newItems: paid });
}

async function reportStep(l: Lease, auth: Auth, from: Date | undefined, ingest: Ingest) {
	const r = await syncReport(
		l.accountId,
		l.syncedUntil,
		auth,
		l.floor,
		() => progress(l.accountId, { runningSince: sql`now()` }),
		from
	);
	const added = await ingest(r.rows);
	await progress(l.accountId, {
		newItems: sql`coalesce(${mpSyncState.newItems}, 0) + ${added}`
	});
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
		await progress(
			l.accountId,
			ok
				? {
						runningSince: null,
						phase: null,
						lastError: null,
						...(end
							? {
									syncedUntil: sql`greatest(${mpSyncState.syncedUntil}, ${end.toISOString()}::timestamptz)`
								}
							: {}),
						...(from
							? {
									coveredFrom: sql`least(${mpSyncState.coveredFrom}, ${from.toISOString()}::timestamptz)`
								}
							: {}),
						lastRunAt: sql`now()`,
						autoApproved
					}
				: { runningSince: null, phase: null, lastError: code, autoApproved }
		);
	} catch (e) {
		// A failed final write leaves runningSince set; the lease expires after LEASE_MINUTES.
		console.error('mp sync failed: db', errorDetail(e));
	}
}

/**
 * Runs payments, then (with `report`) the release report, under a held lease and releases it. Never throws.
 * synced_until is the report cursor: only a report run moves it (never backwards, also a backfill, whose
 * window from `from` reaches the report end continuously). A successful run with `from` lowers covered_from to it; a failed one leaves it, so
 * the next run retries the backfill. Each stored batch auto-approves what a rule recognizes (also after a failed run:
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
		const { auth, me } = await whoAmI(await currentToken(l.userId));
		await paymentsStep(l, me, auth, { from, report }, ingest);
		if (report) end = await reportStep(l, auth, from, ingest);
		ok = true;
	} catch (e) {
		code = mpCode(e) ?? 'network';
		const { path, detail } = e as { path?: string; detail?: string };
		console.error(`mp sync failed: ${code}`, path ?? '', detail ?? '');
	}
	if (!ok) autoApproved += await autoApprovePending(l.userId);
	await release(l, ok, code, end, from, autoApproved);
}

export type MpSyncOptions = {
	/** Also pull the release report; a function decides from the account's report cursor. */
	report: boolean | ((syncedUntil: Date | null) => boolean);
	/** "Traer movimientos desde": both windows start here; a report run still advances synced_until. */
	from?: Date;
	/** Return once the lease is held; the run continues while the inbox polls the progress. */
	background?: boolean;
};

/**
 * Takes the user's lease (false when off or held elsewhere) and runs the sync; the scheduler waits for it.
 * Without a `from`, a run that is due to pull the report (per `report`, so the scheduler's guard still applies)
 * backfills from the chosen "Importar desde" while covered_from is null or later than it, so a failed backfill
 * is retried by the next due run. Payments-only runs never backfill.
 */
export async function runMpSync(userId: string, opts: MpSyncOptions): Promise<boolean> {
	const lease = await acquire(userId);
	if (!lease) return false;
	const report = typeof opts.report === 'function' ? opts.report(lease.syncedUntil) : opts.report;
	const backfill =
		report &&
		!opts.from &&
		!!lease.floor &&
		(!lease.coveredFrom || lease.coveredFrom > lease.floor);
	const from = backfill ? (lease.floor ?? undefined) : opts.from;
	const run = execute(lease, { from, report });
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
