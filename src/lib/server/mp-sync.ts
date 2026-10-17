import { env } from '$env/dynamic/private';
import { and, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from './db';
import { financialAccounts, mpImportItems, mpSyncState } from './db/schema';
import { canAccessImport, importOwnedBy } from './access';
import { dayStart, localDay } from './month';

/** Stored in mp_sync_state.last_error: a code only, never a message or payload. */
export type MpSyncError =
	'auth' | 'report_timeout' | 'network' | 'parse' | 'config' | `mp_${number}`;

const DEFAULT_BASE_URL = 'https://api.mercadopago.com';
const HTTP_TIMEOUT_MS = 30_000;
const DAY_MS = 86_400_000;
const CHUNK_DAYS = 31; // MP report range limit is unverified: single constant
const OVERLAP_DAYS = 3;
const DEFAULT_BACKFILL_DAYS = 30;
const END_LAG_MS = 5 * 60_000;
const POLL_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_POLL_MS = 15_000;
const BATCH = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AMOUNT_RE = /^-?\d+(?:[.,]\d{1,2})?$/;
const IGNORED = new Set(['', 'reserve_for_payment', 'reserve_for_payout']);

type Row = Record<string, string>;
type Candidate = {
	key: string;
	kind: string;
	occurredAt: Date;
	amount: number;
	isCredit: boolean;
	sourceId: string;
	rawDescription: string;
};
type Enrichment = {
	kind?: string;
	operationType: string | null;
	poiType: string | null;
	merchant: string | null;
	counterpartyId: string | null;
	counterpartyNickname: string | null;
};

const fail = (code: MpSyncError) => Object.assign(new Error(code), { mp: true });
const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : null);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const batches = <T>(xs: T[]) =>
	Array.from({ length: Math.ceil(xs.length / BATCH) }, (_, i) =>
		xs.slice(i * BATCH, (i + 1) * BATCH)
	);

/** MP_IMPORT_ACCOUNT_ID, or null when unset/malformed. */
export function mpImportAccountId(): string | null {
	const id = env.MP_IMPORT_ACCOUNT_ID?.trim();
	return id && UUID_RE.test(id) ? id : null;
}

/** True when both the token and the account id are set. */
export function mpConfigured(): boolean {
	return !!env.MP_ACCESS_TOKEN && mpImportAccountId() !== null;
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
	let res: Response;
	try {
		res = await fetch((env.MP_API_BASE_URL || DEFAULT_BASE_URL) + path, {
			...init,
			headers: {
				...init.headers,
				Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`
			},
			signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
		});
	} catch {
		throw fail('network');
	}
	if (res.status === 401 || res.status === 403) throw fail('auth');
	if (!res.ok) throw fail(`mp_${res.status}`);
	return res;
}

async function apiJson(path: string, init?: RequestInit): Promise<unknown> {
	const res = await api(path, init);
	try {
		return await res.json();
	} catch {
		throw fail('parse');
	}
}

/** "12.345,67" is not accepted: decimal mark only, 0-2 decimals. Integer cents without floats. */
function cents(raw: string): number {
	const s = raw.trim();
	if (s === '') return 0;
	if (!AMOUNT_RE.test(s)) throw fail('parse');
	const neg = s.startsWith('-');
	const [int, frac = ''] = s.replace(/^-/, '').split(/[.,]/);
	const n = Number(int) * 100 + Number(frac.padEnd(2, '0'));
	return neg ? -n : n;
}

function parseCsv(text: string): Row[] {
	if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
	const head = text.split('\n', 1)[0];
	const sep = (head.match(/;/g)?.length ?? 0) > (head.match(/,/g)?.length ?? 0) ? ';' : ',';
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c !== '"') field += c;
			else if (text[i + 1] === '"') {
				field += '"';
				i++;
			} else quoted = false;
		} else if (c === '"') quoted = true;
		else if (c === sep) {
			row.push(field);
			field = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else field += c;
	}
	if (field !== '' || row.length) rows.push([...row, field]);
	const [header, ...body] = rows.filter((r) => r.some((f) => f.trim() !== ''));
	if (!header) return [];
	const keys = header.map((h) => h.trim().toUpperCase());
	return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

async function downloadReport(begin: Date, end: Date): Promise<string> {
	const names = async () => {
		const list = await apiJson('/v1/account/release_report/list');
		if (!Array.isArray(list)) throw fail('parse');
		return list.map((f) => str(obj(f).file_name)).filter((n): n is string => !!n);
	};
	const known = new Set(await names());
	await api('/v1/account/release_report', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ begin_date: begin.toISOString(), end_date: end.toISOString() })
	});
	const pollMs = Number(env.MP_REPORT_POLL_MS) || DEFAULT_POLL_MS;
	const deadline = Date.now() + POLL_TIMEOUT_MS;
	while (Date.now() < deadline) {
		await sleep(pollMs);
		const fresh = (await names()).find((n) => !known.has(n));
		if (fresh) {
			const res = await api(`/v1/account/release_report/${encodeURIComponent(fresh)}`);
			try {
				return await res.text();
			} catch {
				throw fail('network');
			}
		}
	}
	throw fail('report_timeout');
}

/** Best effort: failures other than auth leave the row without enrichment. */
async function enrich(id: string, me: string): Promise<Enrichment> {
	const out: Enrichment = {
		operationType: null,
		poiType: null,
		merchant: null,
		counterpartyId: null,
		counterpartyNickname: null
	};
	try {
		const p = obj(await apiJson(`/v1/payments/${encodeURIComponent(id)}`));
		out.operationType = str(p.operation_type);
		out.poiType = str(obj(p.point_of_interaction).type);
		const m = str(p.statement_descriptor) || str(p.description);
		out.merchant = m && m.trim().toLowerCase() !== 'varios' ? m : null;
		// Field names differ by direction; the counterparty is whichever side is not me.
		out.counterpartyId =
			[str(obj(p.payer).id), str(p.payer_id), str(obj(p.collector).id), str(p.collector_id)].find(
				(x) => x && x !== me
			) ?? null;
		if (out.counterpartyId) {
			out.counterpartyNickname = str(
				obj(await apiJson(`/users/${encodeURIComponent(out.counterpartyId)}`)).nickname
			);
		}
	} catch (e) {
		if ((e as Error).message === 'auth') throw e;
	}
	return out;
}

function toCandidate(r: Row): Candidate | null {
	const desc = r.DESCRIPTION ?? '';
	if (IGNORED.has(desc)) return null;
	const net = cents(r.NET_CREDIT_AMOUNT ?? '') - cents(r.NET_DEBIT_AMOUNT ?? '');
	if (net === 0) return null;
	const date = new Date(r.DATE ?? '');
	const occurredAt = Number.isNaN(date.getTime()) ? null : dayStart(localDay(date));
	if (!occurredAt) throw fail('parse');
	const isCredit = net > 0;
	const base = { occurredAt, amount: Math.abs(net), isCredit, rawDescription: desc };
	if (desc === 'asset_management') {
		const day = localDay(date);
		return { ...base, key: `yield:${day}`, kind: 'yield', sourceId: day };
	}
	const id = r.SOURCE_ID ?? '';
	if (!id) throw fail('parse');
	const dir = isCredit ? 'in' : 'out';
	if (desc === 'payout') {
		return { ...base, key: `payout:${id}:out`, kind: 'payout', sourceId: id };
	}
	if (desc === 'payment') {
		return { ...base, key: `payment:${id}:${dir}`, kind: 'payment', sourceId: id };
	}
	return { ...base, key: `${desc}:${id}:${dir}`, kind: 'other', sourceId: id };
}

async function sync(accountId: string, ownerId: string, syncedUntil: Date | null) {
	const now = Date.now();
	const end = new Date(now - END_LAG_MS);
	let beginDay: string;
	if (syncedUntil) beginDay = localDay(new Date(syncedUntil.getTime() - OVERLAP_DAYS * DAY_MS));
	else
		beginDay =
			env.MP_IMPORT_FROM?.trim() || localDay(new Date(now - DEFAULT_BACKFILL_DAYS * DAY_MS));
	const begin = dayStart(beginDay);
	if (!begin) throw fail('config');

	const me = str(obj(await apiJson('/users/me')).id);
	if (!me) throw fail('parse');

	// Rows sharing a key (across all chunks) are summed by signed net before any write; the first row's fields stay.
	const sums = new Map<string, Candidate>();
	let balance: number | null = null;
	for (let from = begin.getTime(); from < end.getTime(); from += CHUNK_DAYS * DAY_MS) {
		const next = from + CHUNK_DAYS * DAY_MS;
		// Half-open ranges: a row stamped on a boundary belongs to the next chunk only.
		const to = new Date(next < end.getTime() ? next - 1 : end.getTime());
		for (const r of parseCsv(await downloadReport(new Date(from), to))) {
			if ((r.BALANCE_AMOUNT ?? '') !== '') balance = cents(r.BALANCE_AMOUNT);
			const c = toCandidate(r);
			if (!c) continue;
			const prev = sums.get(c.key);
			const net =
				(prev ? (prev.isCredit ? prev.amount : -prev.amount) : 0) +
				(c.isCredit ? c.amount : -c.amount);
			sums.set(c.key, { ...(prev ?? c), amount: Math.abs(net), isCredit: net >= 0 });
		}
	}

	const nonZero = [...sums.values()].filter((c) => c.amount > 0);
	const candidates = nonZero.filter((c) => c.kind !== 'yield');
	const yields = nonZero.filter((c) => c.kind === 'yield');
	const existing = new Set<string>();
	for (const keys of batches(candidates.filter((c) => c.kind === 'payment').map((c) => c.key))) {
		const found = await db
			.select({ key: mpImportItems.externalKey })
			.from(mpImportItems)
			.where(and(canAccessImport(ownerId), inArray(mpImportItems.externalKey, keys)));
		found.forEach((f) => existing.add(f.key));
	}

	const rows = [];
	for (const c of candidates) {
		// ponytail: sequential enrichment, parallelize if MP rate limits allow and runs get slow
		const e: Partial<Enrichment> =
			c.kind === 'payment' && !existing.has(c.key) ? await enrich(c.sourceId, me) : {};
		rows.push({
			...importOwnedBy(ownerId),
			accountId,
			externalKey: c.key,
			kind: e.operationType === 'account_fund' ? 'account_fund' : c.kind,
			occurredAt: c.occurredAt,
			amount: c.amount,
			isCredit: c.isCredit,
			sourceId: c.sourceId,
			rawDescription: c.rawDescription,
			counterpartyId: e.counterpartyId ?? null,
			counterpartyNickname: e.counterpartyNickname ?? null,
			merchant: e.merchant ?? null,
			operationType: e.operationType ?? null,
			poiType: e.poiType ?? null
		});
	}
	for (const batch of batches(rows)) {
		await db
			.insert(mpImportItems)
			.values(batch)
			.onConflictDoNothing({ target: [mpImportItems.userId, mpImportItems.externalKey] });
	}
	for (const y of yields) {
		const values = {
			...importOwnedBy(ownerId),
			accountId,
			externalKey: y.key,
			kind: y.kind,
			occurredAt: y.occurredAt,
			amount: y.amount,
			isCredit: y.isCredit,
			sourceId: y.sourceId,
			rawDescription: y.rawDescription
		};
		await db
			.insert(mpImportItems)
			.values(values)
			.onConflictDoUpdate({
				target: [mpImportItems.userId, mpImportItems.externalKey],
				set: { amount: values.amount, isCredit: values.isCredit, updatedAt: sql`now()` },
				setWhere: eq(mpImportItems.status, 'pending')
			});
	}
	return { end, balance };
}

type Lease = { accountId: string; ownerId: string; currency: string; syncedUntil: Date | null };

/** Looks up the account, upserts the state row and takes the lease; null when off or held elsewhere. */
async function acquire(): Promise<Lease | null> {
	const accountId = mpImportAccountId();
	if (!mpConfigured() || !accountId) return null;
	try {
		// Job has no user session: the account owner is the user.
		const [acct] = await db
			.select({ ownerId: financialAccounts.ownerId, currency: financialAccounts.currency })
			.from(financialAccounts)
			.where(eq(financialAccounts.id, accountId))
			.limit(1);
		if (!acct) {
			// No account means no state row to record the error on (FK).
			console.error('mp sync failed: config');
			return null;
		}
		await db.insert(mpSyncState).values({ accountId }).onConflictDoNothing();
		const [lease] = await db
			.update(mpSyncState)
			.set({ runningSince: sql`now()` })
			.where(
				and(
					eq(mpSyncState.accountId, accountId),
					or(
						isNull(mpSyncState.runningSince),
						lt(mpSyncState.runningSince, sql`now() - interval '15 minutes'`)
					)
				)
			)
			.returning({ syncedUntil: mpSyncState.syncedUntil });
		return lease ? { accountId, ...acct, syncedUntil: lease.syncedUntil } : null;
	} catch {
		console.error('mp sync failed: network');
		return null;
	}
}

/** Runs the sync under a held lease and releases it. Never throws. */
async function execute(l: Lease): Promise<void> {
	let done: Awaited<ReturnType<typeof sync>> | null = null;
	let code: MpSyncError | null = null;
	try {
		if (l.currency !== 'ARS') throw fail('config');
		done = await sync(l.accountId, l.ownerId, l.syncedUntil);
	} catch (e) {
		code = (e as { mp?: boolean }).mp ? ((e as Error).message as MpSyncError) : 'network';
		console.error(`mp sync failed: ${code}`);
	}
	try {
		await db
			.update(mpSyncState)
			.set(
				done
					? {
							runningSince: null,
							lastError: null,
							syncedUntil: done.end,
							lastRunAt: sql`now()`,
							...(done.balance !== null
								? { reportBalance: done.balance, reportBalanceAt: done.end }
								: {})
						}
					: { runningSince: null, lastError: code }
			)
			.where(eq(mpSyncState.accountId, l.accountId));
	} catch {
		console.error('mp sync failed: network');
	}
}

/** Full sync: acquire the lease, run, release. Never throws; no-op when off or already running. */
export async function runMpSync(): Promise<void> {
	const lease = await acquire();
	if (lease) await execute(lease);
}

/** Awaits only the lease, then runs the sync in the background. Returns whether it started. */
export async function startMpSync(): Promise<boolean> {
	const lease = await acquire();
	if (!lease) return false;
	void execute(lease);
	return true;
}
