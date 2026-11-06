import { env } from '$env/dynamic/private';
import { and, eq, inArray, isNull, lt, max, or, sql } from 'drizzle-orm';
import { db } from './db';
import { financialAccounts, mpConnections, mpImportItems, mpSyncState } from './db/schema';
import { canAccessAccount, canAccessImport, canAccessMpConnection, importOwnedBy } from './access';
import { getAccessToken, listUsableConnections, refreshConnection } from './mp-oauth';
import { dayStart, localDay, TZ } from './month';

/** Stored in mp_sync_state.last_error: a code only, never a message or payload. */
export type MpSyncError =
	'auth' | 'report_timeout' | 'network' | 'parse' | 'config' | 'reconnect' | `mp_${number}`;

const DEFAULT_BASE_URL = 'https://api.mercadopago.com';
const HTTP_TIMEOUT_MS = 30_000;
const DAY_MS = 86_400_000;
const CHUNK_DAYS = 31; // MP report range limit is unverified: single constant
const OVERLAP_DAYS = 3;
// Days, not hours: items from the old release-report sync carry day-start times, and dedupe makes overlap cheap.
const PAYMENTS_OVERLAP_MS = OVERLAP_DAYS * DAY_MS;
const DEFAULT_BACKFILL_DAYS = 30;
const END_LAG_MS = 5 * 60_000;
const POLL_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_POLL_MS = 15_000;
const PAGE = 1000; // payments/search max limit
const BATCH = 500;
const AMOUNT_RE = /^-?\d+(?:[.,]\d{1,2})?$/;
/** Kinds whose items come from payments/search; their latest date is where the next search starts. */
const PAYMENT_KINDS = ['payment', 'account_fund', 'refund'];
/** Refresh the token when it expires within this window (MP tokens last 180 days). */
const REFRESH_WINDOW_MS = 30 * DAY_MS;

type Auth = { token: string };

type Row = Record<string, string>;
/** In an upsert's RETURNING: true when the row was inserted, false when an existing one was updated. */
const INSERTED = sql<boolean>`xmax = 0`;
type Item = typeof mpImportItems.$inferInsert;

const fail = (code: MpSyncError) => Object.assign(new Error(code), { mp: true });
const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : null);
const text = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const batches = <T>(xs: T[]) =>
	Array.from({ length: Math.ceil(xs.length / BATCH) }, (_, i) =>
		xs.slice(i * BATCH, (i + 1) * BATCH)
	);

async function api(path: string, { token }: Auth, init: RequestInit = {}): Promise<Response> {
	let res: Response;
	try {
		res = await fetch((env.MP_API_BASE_URL || DEFAULT_BASE_URL) + path, {
			...init,
			headers: {
				...init.headers,
				Authorization: `Bearer ${token}`
			},
			signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
		});
	} catch {
		throw fail('network');
	}
	if (res.status === 401 || res.status === 403) throw fail('auth');
	if (!res.ok) {
		// MP's own error text (never the whole body, which could hold addresses), for the logs only.
		let detail = '';
		try {
			const b = obj(await res.json());
			detail = (str(b.message) ?? str(b.error) ?? '').slice(0, 120);
		} catch {
			/* no JSON body */
		}
		throw Object.assign(fail(`mp_${res.status}`), { detail });
	}
	return res;
}

async function apiJson(path: string, auth: Auth, init?: RequestInit): Promise<unknown> {
	const res = await api(path, auth, init);
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

/** A JSON amount (pesos, up to 2 decimals) in cents; 0 when absent. */
const jsonCents = (v: unknown) => (typeof v === 'number' ? Math.round(v * 100) : 0);

function date(v: unknown): Date {
	const d = new Date(str(v) ?? '');
	if (Number.isNaN(d.getTime())) throw fail('parse');
	return d;
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

/** First-sync start: the user's "importar desde" floor, else DEFAULT_BACKFILL_DAYS ago. */
function backfillStart(now: number, floor: Date | null): Date {
	const begin = floor ?? dayStart(localDay(new Date(now - DEFAULT_BACKFILL_DAYS * DAY_MS)));
	if (!begin) throw fail('config');
	return begin;
}

/** The later of two dates, treating the floor as optional. */
const atLeast = (d: Date, floor: Date | null) => (floor && floor > d ? floor : d);

// ---------- Payments: /v1/payments/search, both sides, in seconds ----------

/** Every payment last updated in [begin, end], oldest update first. Dates need milliseconds. */
async function searchPayments(
	begin: Date,
	end: Date,
	auth: Auth
): Promise<Record<string, unknown>[]> {
	const out: Record<string, unknown>[] = [];
	for (let offset = 0; ; offset += PAGE) {
		const q = new URLSearchParams({
			range: 'date_last_updated',
			begin_date: begin.toISOString(),
			end_date: end.toISOString(),
			sort: 'date_last_updated',
			criteria: 'asc',
			limit: String(PAGE),
			offset: String(offset)
		});
		const page = obj(await apiJson(`/v1/payments/search?${q}`, auth));
		if (!Array.isArray(page.results)) throw fail('parse');
		out.push(...page.results.map(obj));
		if (page.results.length < PAGE || offset + PAGE >= Number(obj(page.paging).total)) return out;
	}
}

/** Merchant text of a payment: debit-card commerce, card descriptor, QR description or item. */
function merchantOf(p: Record<string, unknown>): string | null {
	const poi = obj(p.point_of_interaction);
	const items = obj(p.additional_info).items;
	return (
		[
			obj(obj(poi.transaction_data).commerce).name,
			p.statement_descriptor,
			p.description,
			Array.isArray(items) ? obj(items[0]).title : null
		]
			.map(text)
			.find((m) => m && m.toLowerCase() !== 'varios') ?? null
	);
}

/**
 * Imports approved payments as pending items, skipping credit-card ones (they never touch the balance).
 * Refunds and chargebacks (seen through date_last_updated) become a separate `refund` item in the
 * opposite direction, but only when the payment is still approved (partial refund) or was already imported
 * and not rejected; a payment refunded before it was ever imported nets to zero and is skipped.
 */
async function syncPayments(
	accountId: string,
	ownerId: string,
	me: string,
	auth: Auth,
	floor: Date | null,
	from?: Date
): Promise<number> {
	const now = Date.now();
	const [last] = await db
		.select({ at: max(mpImportItems.occurredAt) })
		.from(mpImportItems)
		.where(
			and(
				canAccessImport(ownerId),
				eq(mpImportItems.accountId, accountId),
				inArray(mpImportItems.kind, PAYMENT_KINDS)
			)
		);
	const begin =
		from ??
		(last?.at
			? atLeast(new Date(last.at.getTime() - PAYMENTS_OVERLAP_MS), floor)
			: backfillStart(now, floor));
	const payments = (await searchPayments(begin, new Date(now), auth)).filter(
		(p) => str(p.payment_type_id) !== 'credit_card'
	);

	const existing = new Map<string, string>();
	const ids = payments.map((p) => str(p.id)).filter((id): id is string => !!id);
	for (const batch of batches(ids)) {
		const found = await db
			.select({ key: mpImportItems.externalKey, status: mpImportItems.status })
			.from(mpImportItems)
			.where(and(canAccessImport(ownerId), inArray(mpImportItems.sourceId, batch)));
		found.forEach((f) => existing.set(f.key, f.status));
	}

	const nicknames = new Map<string, string | null>();
	/** Best effort: failures other than auth leave the nickname empty. */
	const nickname = async (id: string) => {
		if (!nicknames.has(id)) {
			let n: string | null = null;
			try {
				n = text(obj(await apiJson(`/users/${encodeURIComponent(id)}`, auth)).nickname);
			} catch (e) {
				if ((e as Error).message === 'auth') throw e;
			}
			nicknames.set(id, n);
		}
		return nicknames.get(id) ?? null;
	};

	const inserts: Item[] = [];
	const refunds: Item[] = [];
	for (const p of payments) {
		const id = str(p.id);
		if (!id) throw fail('parse');
		const payerId = str(obj(p.payer).id) ?? str(p.payer_id);
		const collectorId = str(p.collector_id) ?? str(obj(p.collector).id);
		const isCredit = collectorId === me;
		if (!isCredit && payerId !== me) continue;
		const key = `payment:${id}:${isCredit ? 'in' : 'out'}`;
		const refundKey = `refund:${id}:${isCredit ? 'out' : 'in'}`;
		const status = str(p.status);
		// Incoming: what reached the balance after MP fees; outgoing: what left it.
		const amount =
			(isCredit && jsonCents(obj(p.transaction_details).net_received_amount)) ||
			jsonCents(p.transaction_amount);
		const reversed = status === 'refunded' || status === 'charged_back';
		const refunded = jsonCents(p.transaction_amount_refunded) || (reversed ? amount : 0);
		const known = existing.get(key);
		const wantMain = status === 'approved' && amount > 0 && !known;
		const wantRefund =
			refunded > 0 &&
			(status === 'approved' || (known !== undefined && known !== 'rejected')) &&
			existing.get(refundKey) !== 'approved' &&
			existing.get(refundKey) !== 'rejected';
		if (!wantMain && !wantRefund) continue;

		const counterpartyId = isCredit ? (payerId !== me ? payerId : null) : collectorId;
		const payer = obj(p.payer);
		const nick = !counterpartyId
			? null
			: isCredit
				? [text(payer.first_name), text(payer.last_name)].filter(Boolean).join(' ') || null
				: await nickname(counterpartyId);
		const operationType = str(p.operation_type);
		const base = {
			...importOwnedBy(ownerId),
			accountId,
			sourceId: id,
			counterpartyId,
			counterpartyNickname: nick,
			merchant: merchantOf(p),
			operationType,
			poiType: str(obj(p.point_of_interaction).type)
		};
		if (wantMain)
			inserts.push({
				...base,
				externalKey: key,
				kind: operationType === 'account_fund' ? 'account_fund' : 'payment',
				occurredAt: date(p.date_approved ?? p.date_created),
				amount,
				isCredit,
				rawDescription: text(p.description) ?? operationType ?? 'payment'
			});
		if (wantRefund)
			refunds.push({
				...base,
				externalKey: refundKey,
				kind: 'refund',
				occurredAt: date(p.date_last_updated),
				amount: refunded,
				isCredit: !isCredit,
				rawDescription: status ?? 'refund'
			});
	}
	let added = 0;
	for (const batch of batches(inserts)) {
		const rows = await db
			.insert(mpImportItems)
			.values(batch)
			.onConflictDoNothing({ target: [mpImportItems.userId, mpImportItems.externalKey] })
			.returning({ id: mpImportItems.id });
		added += rows.length;
	}
	// A later partial refund grows the amount while the item is still pending.
	for (const r of refunds) {
		const rows = await db
			.insert(mpImportItems)
			.values(r)
			.onConflictDoUpdate({
				target: [mpImportItems.userId, mpImportItems.externalKey],
				set: { amount: r.amount, occurredAt: r.occurredAt, updatedAt: sql`now()` },
				setWhere: eq(mpImportItems.status, 'pending')
			})
			.returning({ inserted: INSERTED });
		if (rows[0]?.inserted) added++;
	}
	return added;
}

// ---------- Release report ("Liquidaciones"): yields and payouts, minutes in MP's queue ----------

const REPORT = '/v1/account/release_report';
/**
 * Every column the CSV parser reads. A new config gets exactly these; an existing one gets the missing
 * ones appended (reportItem and syncReport would otherwise read blanks).
 */
const REPORT_COLUMNS = [
	'DATE',
	'SOURCE_ID',
	'EXTERNAL_REFERENCE',
	'RECORD_TYPE',
	'DESCRIPTION',
	'NET_CREDIT_AMOUNT',
	'NET_DEBIT_AMOUNT',
	'TRANSACTION_DATE'
];

/**
 * Config created in an MP account that has none (the report create answers 404 without one). No
 * `scheduled`: MP ignores `frequency` unless scheduling is on. An empty `notification_email_list` keeps
 * extra recipients off MP's "report ready" email; MP mails the account owner on every report anyway, which
 * is why the scheduler requests it once a day (see runMpSyncAll). `GMT-03` is Buenos Aires.
 * `include_withdrawal_at_end` is on so a payout stamped at the very end of a range is never left out
 * (a repeat is harmless: the item key dedupes it).
 */
const REPORT_CONFIG = {
	file_name_prefix: 'gastar-release',
	display_timezone: 'GMT-03',
	report_translation: 'en',
	include_withdrawal_at_end: true,
	columns: REPORT_COLUMNS.map((key) => ({ key })),
	frequency: { hour: 0, type: 'monthly', value: 1 },
	notification_email_list: [] as string[]
};

/**
 * The config fields MP documents as writable ("Atributos configurables"). A PUT sends only these: the GET
 * also returns read-only and internal keys (`scheduled`, ...) that MP's examples never send.
 */
const WRITABLE_CONFIG_KEYS = [
	'columns',
	'file_name_prefix',
	'frequency',
	'sftp_info',
	'separator',
	'display_timezone',
	'report_translation',
	'notification_email_list',
	'include_withdrawal_at_end',
	'execute_after_withdrawal',
	'check_available_balance',
	'compensate_detail'
] as const;

/** What the sync needs from a config: no listed address, the parser columns, English headers. */
function inspectConfig(config: Record<string, unknown>) {
	const list = Array.isArray(config.notification_email_list) ? config.notification_email_list : [];
	// MP shows an empty list as [{}] or [null]: only a real address counts.
	const hasEmails = list.some((e) => typeof e === 'string' && e.trim() !== '');
	const columns = Array.isArray(config.columns) ? config.columns : [];
	const have = new Set(columns.map((c) => str(obj(c).key)));
	const missing = REPORT_COLUMNS.filter((key) => !have.has(key));
	const translated = config.report_translation != null && config.report_translation !== 'en';
	return { hasEmails, columns, missing, translated };
}

/** The PUT body: the user's own writable values, plus our changes. Never `scheduled` or any other key. */
function configPutBody(config: Record<string, unknown>, columns: unknown[], missing: string[]) {
	const body: Record<string, unknown> = {};
	for (const key of WRITABLE_CONFIG_KEYS) {
		const v = config[key];
		if (v === undefined || v === null) continue;
		if (key === 'sftp_info' && Object.keys(obj(v)).length === 0) continue;
		body[key] = v;
	}
	body.notification_email_list = [];
	body.columns = [...columns, ...missing.map((key) => ({ key }))];
	if (inspectConfig(config).translated) body.report_translation = 'en';
	return body;
}

/**
 * Makes sure the account has a release report config the parser can read, before any report is created.
 * Missing config (404): created. Existing config: never replaced, only edited in place by a PUT of the
 * documented writable fields (the user's values kept) with the email list emptied, the parser columns
 * appended to the user's own, and the header language set to English when it was translated (the parser
 * reads English keys). Best effort and never fails the sync: if the PUT does not go through, a CSV without
 * the columns fails as `parse` (see syncReport).
 */
async function ensureReportConfig(auth: Auth): Promise<void> {
	const path = `${REPORT}/config`;
	let config: Record<string, unknown>;
	try {
		config = obj(await apiJson(path, auth));
	} catch (e) {
		const code = (e as Error).message;
		if (code === 'mp_404') {
			await api(path, auth, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(REPORT_CONFIG)
			});
			return;
		}
		if (code === 'auth') throw e;
		console.warn('mp release config: could not read it');
		return;
	}
	const { hasEmails, columns, missing, translated } = inspectConfig(config);
	if (!hasEmails && missing.length === 0 && !translated) return;
	try {
		await api(path, auth, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(configPutBody(config, columns, missing))
		});
	} catch (e) {
		if ((e as Error).message === 'auth') throw e;
		console.warn(
			`mp release config: PUT failed, ${(e as Error).message} ${(e as { detail?: string }).detail ?? ''}`.trimEnd()
		);
	}
}

async function downloadReport(begin: Date, end: Date, auth: Auth): Promise<string> {
	const res = await api(REPORT, auth, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			// Reports reject milliseconds: send YYYY-MM-DDTHH:MM:SSZ.
			begin_date: begin.toISOString().replace(/\.\d{3}Z$/, 'Z'),
			end_date: end.toISOString().replace(/\.\d{3}Z$/, 'Z')
		})
	});
	let created: unknown;
	try {
		created = await res.json();
	} catch {
		throw fail('parse');
	}
	const id = str(obj(created).id);
	if (!id) throw fail('parse');
	const pollMs = Number(env.MP_REPORT_POLL_MS) || DEFAULT_POLL_MS;
	const deadline = Date.now() + POLL_TIMEOUT_MS;
	let doneWithoutFile = false;
	while (Date.now() < deadline) {
		await sleep(pollMs);
		const t = obj(await apiJson(`${REPORT}/task/${encodeURIComponent(id)}`, auth));
		const status = str(t.status)?.toLowerCase() ?? '';
		if (TASK_FAILED.has(status)) throw fail('parse');
		if (!TASK_DONE.has(status)) continue;
		const file = taskFile(t);
		if (!file) {
			// The file may lag the status by a poll; if it never shows, the shape is not what we expect.
			doneWithoutFile = true;
			continue;
		}
		const res = await api(`${REPORT}/${encodeURIComponent(file)}`, auth);
		try {
			return await res.text();
		} catch {
			throw fail('network');
		}
	}
	throw fail(doneWithoutFile ? 'parse' : 'report_timeout');
}

/** A ready task reports `processed` (the documented list status; `available` is the old report's word). */
const TASK_DONE = new Set(['processed', 'available']);
const TASK_FAILED = new Set(['failed', 'error', 'errored', 'rejected', 'cancelled', 'canceled']);
const CSV_FILE_RE = /^[\w.-]+\.csv$/i;

/** The CSV name of a ready task: its `file_name`, else the first CSV in a `files` list of `{ name }` entries. */
function taskFile(task: Record<string, unknown>): string | null {
	const direct = text(task.file_name);
	if (direct && CSV_FILE_RE.test(direct)) return direct;
	if (!Array.isArray(task.files)) return null;
	const name = task.files.map((f) => text(obj(f).name)).find((n) => n && CSV_FILE_RE.test(n));
	return name ?? null;
}

/** Net amount of a release row in cents: credit minus debit. Each column is read by magnitude (MP prints debits unsigned). */
function netCents(r: Row): number {
	return Math.abs(cents(r.NET_CREDIT_AMOUNT ?? '')) - Math.abs(cents(r.NET_DEBIT_AMOUNT ?? ''));
}

/**
 * Only `release` rows described as `payout` (money leaving the available balance), `asset_management_gain`
 * or `asset_management_loss` (daily yield); every other row is a payment, which payments/search already
 * brings, or a balance line. A payout with an EXTERNAL_REFERENCE is a payment at a merchant
 * (interoperable QR); without one it is a transfer or withdrawal. A yield row is signed (a loss is a debit);
 * syncReport nets them per local day. Keys are the ones the old settlement report used.
 */
function reportItem(r: Row): Omit<Item, 'userId' | 'accountId'> | null {
	if (r.RECORD_TYPE !== 'release') return null;
	const isYield =
		r.DESCRIPTION === 'asset_management_gain' || r.DESCRIPTION === 'asset_management_loss';
	if (!isYield && r.DESCRIPTION !== 'payout') return null;
	const signed = netCents(r);
	if (signed === 0) return null;
	const occurredAt = date(r.DATE);
	if (isYield) {
		// The day key comes from TRANSACTION_DATE, as with the settlement report, so a day imported before
		// the switch keeps its key even if MP stamps the release (DATE) on another day.
		const day = localDay(date(r.TRANSACTION_DATE || r.DATE));
		const base = { occurredAt, amount: Math.abs(signed), isCredit: signed > 0 };
		return {
			...base,
			externalKey: `yield:${day}`,
			kind: 'yield',
			sourceId: day,
			rawDescription: 'asset_management'
		};
	}
	const id = r.SOURCE_ID ?? '';
	if (!id) throw fail('parse');
	// A payout only takes; a credit under that description (a reversal) is not one.
	if (signed > 0) return null;
	return {
		externalKey: `payout:${id}:out`,
		kind: r.EXTERNAL_REFERENCE ? 'merchant_payout' : 'payout',
		sourceId: id,
		occurredAt,
		amount: -signed,
		isCredit: false,
		rawDescription: 'payout'
	};
}

/**
 * Pulls the release report from the last report sync (minus overlap) to now. Returns the new end and the items it added.
 * The cursor is the one the settlement report left (mp_sync_state.synced_until): the next run continues from it.
 */
async function syncReport(
	accountId: string,
	ownerId: string,
	syncedUntil: Date | null,
	auth: Auth,
	floor: Date | null,
	from?: Date
) {
	const now = Date.now();
	const end = new Date(now - END_LAG_MS);
	const begin = from
		? dayStart(localDay(from))
		: syncedUntil
			? dayStart(
					localDay(
						atLeast(
							new Date(syncedUntil.getTime() - OVERLAP_DAYS * DAY_MS),
							floor && dayStart(localDay(floor))
						)
					)
				)
			: backfillStart(now, floor);
	if (!begin) throw fail('config');

	await ensureReportConfig(auth);
	// Yield rows sharing a day (across all chunks) are netted before any write (gains minus losses); the first row's fields stay.
	const items = new Map<string, NonNullable<ReturnType<typeof reportItem>>>();
	for (let from = begin.getTime(); from < end.getTime(); from += CHUNK_DAYS * DAY_MS) {
		const next = from + CHUNK_DAYS * DAY_MS;
		// Half-open ranges: a row stamped on a boundary belongs to the next chunk only.
		const to = new Date(next < end.getTime() ? next - 1 : end.getTime());
		const csv = await downloadReport(new Date(from), to, auth);
		// Each chunk can wait minutes in MP's queue: renew the lease so a long backfill keeps it.
		await db
			.update(mpSyncState)
			.set({ runningSince: sql`now()` })
			.where(eq(mpSyncState.accountId, accountId));
		const parsed = parseCsv(csv);
		// A config that lacks a parser column (the PUT in ensureReportConfig did not go through) reads as blanks.
		if (parsed.length && !REPORT_COLUMNS.every((k) => k in parsed[0])) throw fail('parse');
		for (const r of parsed) {
			const item = reportItem(r);
			if (!item) continue;
			const prev = items.get(item.externalKey);
			if (!prev || item.kind !== 'yield') {
				items.set(item.externalKey, item);
				continue;
			}
			const net = (i: { amount: number; isCredit: boolean }) => (i.isCredit ? i.amount : -i.amount);
			const sum = net(prev) + net(item);
			items.set(item.externalKey, { ...prev, amount: Math.abs(sum), isCredit: sum > 0 });
		}
	}

	let added = 0;
	for (const item of items.values()) {
		// A day whose gains and losses cancel out has nothing to import.
		if (item.amount === 0) continue;
		const values = { ...importOwnedBy(ownerId), accountId, ...item };
		const rows = await db
			.insert(mpImportItems)
			.values(values)
			.onConflictDoUpdate({
				target: [mpImportItems.userId, mpImportItems.externalKey],
				// Also relabels, re-times and re-signs pending items imported by the old syncs. Approved and rejected stay.
				set: {
					kind: values.kind,
					amount: values.amount,
					isCredit: values.isCredit,
					occurredAt: values.occurredAt,
					updatedAt: sql`now()`
				},
				setWhere: eq(mpImportItems.status, 'pending')
			})
			.returning({ inserted: INSERTED });
		if (rows[0]?.inserted) added++;
	}
	return { end, added };
}

type Lease = {
	userId: string;
	accountId: string;
	currency: string;
	syncedUntil: Date | null;
	floor: Date | null;
};

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
					canAccessMpConnection(userId),
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
			.set({ runningSince: sql`now()`, phase: 'payments', newItems: null })
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

/** Refreshes the user's tokens (lease held) and returns the new auth, or the error code to record. */
async function refreshed(userId: string): Promise<Auth> {
	const outcome = await refreshConnection(userId);
	if (outcome === 'reconnect') throw fail('reconnect');
	if (outcome === 'error') throw fail('network');
	const fresh = await getAccessToken(userId);
	if (!fresh) throw fail('reconnect');
	return { token: fresh.token };
}

/** Buenos Aires hour of the daily release report: MP mails the account owner every time one is ready. */
const REPORT_HOUR = 8;
const HOUR_MS = 3_600_000;

/** True during the Buenos Aires hour the scheduler requests the daily release report. */
export function isReportHour(now: Date): boolean {
	const hour = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' })
		.formatToParts(now)
		.find((p) => p.type === 'hour')?.value;
	return Number(hour) === REPORT_HOUR;
}

/**
 * Whether the scheduler still owes this account today's report: none since the last REPORT_HOUR, with an
 * hour of slack because synced_until trails the run (END_LAG_MS) and a manual sync shortly before counts.
 */
function reportDue(syncedUntil: Date | null, now: Date): boolean {
	if (!syncedUntil) return true;
	const today = dayStart(localDay(now));
	if (!today) return false;
	let last = today.getTime() + REPORT_HOUR * HOUR_MS;
	if (last > now.getTime()) last -= DAY_MS;
	return syncedUntil.getTime() < last - HOUR_MS;
}

/**
 * Runs payments, then (with `report`) the release report, under a held lease and releases it. Never throws.
 * synced_until is the report cursor: only a report run moves it, and a backfill (`from`, both windows start
 * there) leaves it alone.
 */
async function execute(
	l: Lease,
	{ from, report }: { from?: Date; report: boolean }
): Promise<void> {
	let ok = false;
	let end: Date | null = null;
	let code: MpSyncError | null = null;
	try {
		if (l.currency !== 'ARS') throw fail('config');
		const stored = await getAccessToken(l.userId);
		if (!stored) throw fail('reconnect');
		let auth: Auth = { token: stored.token };
		// Refresh ahead of expiry; if MP is unreachable the current token may still work.
		if (stored.expiresAt.getTime() < Date.now() + REFRESH_WINDOW_MS) {
			try {
				auth = await refreshed(l.userId);
			} catch (e) {
				if ((e as Error).message === 'reconnect' || stored.expiresAt.getTime() <= Date.now())
					throw e;
			}
		}
		let meJson: unknown;
		try {
			meJson = await apiJson('/users/me', auth);
		} catch (e) {
			// A 401 here means the token died early: refresh once and retry the run once.
			if ((e as Error).message !== 'auth') throw e;
			auth = await refreshed(l.userId);
			meJson = await apiJson('/users/me', auth);
		}
		const me = str(obj(meJson).id);
		if (!me) throw fail('parse');
		const paid = await syncPayments(l.accountId, l.userId, me, auth, l.floor, from);
		// Progress for the inbox: payments are stored, the report is next (if any).
		await db
			.update(mpSyncState)
			.set({ phase: report ? 'report' : 'payments', newItems: paid })
			.where(eq(mpSyncState.accountId, l.accountId));
		if (report) {
			const r = await syncReport(l.accountId, l.userId, l.syncedUntil, auth, l.floor, from);
			await db
				.update(mpSyncState)
				.set({ newItems: sql`coalesce(${mpSyncState.newItems}, 0) + ${r.added}` })
				.where(eq(mpSyncState.accountId, l.accountId));
			end = r.end;
		}
		ok = true;
	} catch (e) {
		code = (e as { mp?: boolean }).mp ? ((e as Error).message as MpSyncError) : 'network';
		console.error(`mp sync failed: ${code}`);
	}
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
							lastRunAt: sql`now()`
						}
					: { runningSince: null, phase: null, lastError: code }
			)
			.where(eq(mpSyncState.accountId, l.accountId));
	} catch {
		console.error('mp sync failed: network');
	}
}

/**
 * Scheduler entry: syncs every usable connection one after another. Never throws; one user failing does not
 * stop the rest. Payments always; the release report only with `report` and when the account has not had
 * one since the last REPORT_HOUR (so a restart or a second container never requests it twice a day).
 */
export async function runMpSyncAll(report: boolean): Promise<void> {
	let users: string[];
	try {
		users = await listUsableConnections();
	} catch {
		console.error('mp sync failed: network');
		return;
	}
	for (const userId of users) {
		try {
			const lease = await acquire(userId);
			if (lease)
				await execute(lease, { report: report && reportDue(lease.syncedUntil, new Date()) });
		} catch {
			console.error('mp sync failed: network');
		}
	}
}

/** "Sincronizar ahora": awaits the lease only; payments and the report run in the background while the inbox polls the progress. */
export async function startMpSync(userId: string): Promise<boolean> {
	const lease = await acquire(userId);
	if (!lease) return false;
	void execute(lease, { report: true });
	return true;
}

/** "Traer movimientos desde": like startMpSync, but both windows start at `from` and synced_until stays as it is. */
export async function startMpBackfill(userId: string, from: Date): Promise<boolean> {
	const lease = await acquire(userId);
	if (!lease) return false;
	void execute(lease, { from, report: true });
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
			newItems: mpSyncState.newItems
		})
		.from(mpSyncState)
		.innerJoin(financialAccounts, eq(mpSyncState.accountId, financialAccounts.id))
		.where(and(eq(mpSyncState.accountId, accountId), canAccessAccount(userId)))
		.limit(1);
	return row ?? null;
}
