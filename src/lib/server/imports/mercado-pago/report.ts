import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { mpSyncState } from '../../db/schema';
import type { ImportRow } from '../ingest';
import { payoutKey, yieldKey } from '../keys';
import { backfillStart } from '../settings';
import { KIND } from '#lib/imports.ts';

import { DAY_MS } from '#lib/dates.ts';
import { dayStart, localDay } from '../../month';
import {
	api,
	apiJson,
	atLeast,
	type Auth,
	cents,
	date,
	fail,
	obj,
	OVERLAP_DAYS,
	parseCsv,
	type Row,
	str,
	text,
	isAuthError,
	mpCode
} from './client';
import { reportPollMs, reportTimeoutMs } from './env';

// Release report ("Liquidaciones"): yields and payouts, minutes in MP's queue.

const CHUNK_DAYS = 31; // MP report range limit is unverified: single constant
const END_LAG_MS = 5 * 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
 * is why the scheduler requests it once a day (see scheduler.ts). `GMT-03` is Buenos Aires.
 * `include_withdrawal_at_end` is on so a payout stamped at the very end of a range is never left out
 * (a repeat is harmless: the item key dedupes it).
 * `execute_after_withdrawal` is required: MP rejects a create without it; false means MP does not
 * generate a report on its own after each withdrawal.
 */
const REPORT_CONFIG = {
	file_name_prefix: 'gastar-release',
	display_timezone: 'GMT-03',
	report_translation: 'en',
	include_withdrawal_at_end: true,
	execute_after_withdrawal: false,
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
		if (mpCode(e) === 'mp_404') {
			await api(path, auth, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(REPORT_CONFIG)
			});
			return;
		}
		if (isAuthError(e)) throw e;
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
		if (isAuthError(e)) throw e;
		console.warn(
			`mp release config: PUT failed, ${(e as Error).message} ${(e as { detail?: string }).detail ?? ''}`.trimEnd()
		);
	}
}

/**
 * The task of each account's last chunk that timed out in MP's queue. The next run reuses it instead of
 * queueing a new report behind it. In memory: a restart just requests a new report.
 */
const pending = new Map<string, { id: string; begin: number; end: number; at: number }>();
const PENDING_TTL_MS = 60 * 60_000;

/** `reuse`: a task already queued for this range (`end` is its own); it is polled, not created. */
async function downloadReport(
	accountId: string,
	begin: Date,
	end: Date,
	auth: Auth,
	reuse?: { id: string; at: number }
): Promise<string> {
	let doneWithoutFile = false;
	let id = reuse?.id ?? '';
	try {
		if (!reuse) {
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
			id = str(obj(created).id) ?? '';
			if (!id) throw fail('parse');
		}
		const pollMs = reportPollMs();
		const deadline = Date.now() + reportTimeoutMs();
		let wait = !reuse; // a reused task has been queued for a while: check it right away
		while (Date.now() < deadline) {
			if (wait) await sleep(pollMs);
			wait = true;
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
				const csv = await res.text();
				pending.delete(accountId);
				return csv;
			} catch {
				throw fail('network');
			}
		}
		if (doneWithoutFile) throw fail('parse');
	} catch (e) {
		pending.delete(accountId);
		throw e;
	}
	pending.set(accountId, {
		id,
		begin: begin.getTime(),
		end: end.getTime(),
		at: reuse?.at ?? Date.now()
	});
	throw fail('report_timeout');
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
 * Only `release` rows described as `payout` (money leaving the available balance) or `asset_management`
 * (daily yield; real reports use that one description, signed by credit/debit, though the documented
 * `asset_management_gain` / `asset_management_loss` are accepted too); every other row is a payment, which
 * payments/search already brings, or a balance line. A payout with an EXTERNAL_REFERENCE is a payment at a merchant
 * (interoperable QR); without one it is a transfer or withdrawal. A yield row is signed (a loss is a debit);
 * syncReport nets them per local day. Keys are the ones the old settlement report used.
 */
function reportItem(r: Row): Omit<ImportRow, 'accountId'> | null {
	if (r.RECORD_TYPE !== 'release') return null;
	const isYield =
		r.DESCRIPTION === 'asset_management' ||
		r.DESCRIPTION === 'asset_management_gain' ||
		r.DESCRIPTION === 'asset_management_loss';
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
			externalKey: yieldKey(day),
			kind: KIND.yield,
			sourceId: day,
			rawDescription: 'asset_management'
		};
	}
	const id = r.SOURCE_ID ?? '';
	if (!id) throw fail('parse');
	// A payout only takes; a credit under that description (a reversal) is not one.
	if (signed > 0) return null;
	return {
		externalKey: payoutKey(id),
		kind: r.EXTERNAL_REFERENCE ? KIND.merchantPayout : KIND.payout,
		sourceId: id,
		occurredAt,
		amount: -signed,
		isCredit: false,
		rawDescription: 'payout'
	};
}

/**
 * Pulls the release report from the last report sync (minus overlap) to now. Returns the new end and the items.
 * The cursor is the one the settlement report left (mp_sync_state.synced_until): the next run continues from it.
 */
export async function syncReport(
	accountId: string,
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
	const items = new Map<string, NonNullable<ReturnType<typeof reportItem>>>();
	let reportEnd = end;
	for (let from = begin.getTime(); from < end.getTime(); from += CHUNK_DAYS * DAY_MS) {
		const next = from + CHUNK_DAYS * DAY_MS;
		// Half-open ranges: a row stamped on a boundary belongs to the next chunk only.
		const to = new Date(next < end.getTime() ? next - 1 : end.getTime());
		const last = next >= end.getTime();
		const p = pending.get(accountId);
		const reuse =
			p &&
			p.begin === from &&
			now - p.at < PENDING_TTL_MS &&
			(p.end === to.getTime() || (last && p.end <= end.getTime()))
				? p
				: null;
		// A reused report stops at its own end: the cursor must not claim more than it covered.
		if (reuse && last) reportEnd = new Date(reuse.end);
		const csv = await downloadReport(
			accountId,
			new Date(from),
			reuse ? new Date(reuse.end) : to,
			auth,
			reuse ?? undefined
		);
		// Each chunk can wait minutes in MP's queue: renew the lease so a long backfill keeps it.
		await db
			.update(mpSyncState)
			.set({ runningSince: sql`now()` })
			.where(eq(mpSyncState.accountId, accountId));
		const parsed = parseCsv(csv);
		// A config that lacks a parser column (the PUT in ensureReportConfig did not go through) reads as blanks.
		if (parsed.length && !REPORT_COLUMNS.every((k) => k in parsed[0])) throw fail('parse');
		// Row shapes only (MP's codes, no amounts or ids): shows which descriptions a real report uses.
		const shapes: Record<string, number> = {};
		for (const r of parsed) {
			const k = `${r.RECORD_TYPE}/${r.DESCRIPTION}`;
			shapes[k] = (shapes[k] ?? 0) + 1;
		}
		console.info('mp report rows:', JSON.stringify(shapes));
		for (const r of parsed) {
			const item = reportItem(r);
			if (!item) continue;
			const prev = items.get(item.externalKey);
			if (!prev || item.kind !== KIND.yield) {
				items.set(item.externalKey, item);
				continue;
			}
			const net = (i: { amount: number; isCredit: boolean }) => (i.isCredit ? i.amount : -i.amount);
			const sum = net(prev) + net(item);
			items.set(item.externalKey, { ...prev, amount: Math.abs(sum), isCredit: sum > 0 });
		}
	}

	const rows = [...items.values()]
		.filter((item) => item.amount !== 0)
		.map((item) => ({ ...item, accountId }));
	return { end: reportEnd, rows };
}
