import { and, eq, inArray, isNull, like, gte, lt, or, type SQL } from 'drizzle-orm';
import type { Currency } from '#lib/money.ts';
import { canAccessAccount, canAccessOwn } from '../../access';
import { db } from '../../db';
import { cardAlerts, financialAccounts, mpImportItems } from '../../db/schema';
import { dayStart, localDay } from '../../month';
import { batches, type ImportRow } from '../ingest';
import { ALERT_KEYS, alertKey, diffKey, STATEMENT_KEYS, statementPurchaseDay } from '../keys';
import { importSource, KIND, type SourceId } from '../sources';
import type { StatementLine } from './statement';

// Matches a Gmail credit-card alert with the statement line of the same purchase, in either order, so
// the purchase is one item: the alert item stores the line's key in `alias_key` (or the other way round).

/** An alert dated from MATCH_DAYS_BEFORE days before to MATCH_DAYS_AFTER days after a line can match it. */
export const MATCH_DAYS_BEFORE = 3;
export const MATCH_DAYS_AFTER = 1;
/** A pesos line matches an alert whose amount differs by at most this percentage (and a compatible merchant). */
export const ARS_AMOUNT_TOLERANCE_PCT = 15;
/** The alert of a purchase in installments carries the total; it matches the cuota times N within this percentage. */
export const INSTALLMENT_TOTAL_TOLERANCE_PCT = 1;
/** Uploaded statements (closing after the alert) an alert survives before "No apareció en el resumen". */
export const UNMATCHED_AFTER_STATEMENTS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;
const dayNumber = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`) / DAY_MS;
const shiftDay = (ymd: string, days: number) =>
	new Date((dayNumber(ymd) + days) * DAY_MS).toISOString().slice(0, 10);

type Side = {
	/** The local day: the alert's day, or the line's purchase day. */
	day: string;
	/** Positive minor units (the cuota for an installment line). */
	amount: number;
	/** Cleaned, lowercase merchant name. */
	merchant: string;
	/** Cuota as printed (`01/06`) of a statement side. */
	installment?: string | null;
};
type Candidate = Side & { id: string };

const commonPrefix = (a: string, b: string) => {
	let n = 0;
	while (n < a.length && n < b.length && a[n] === b[n]) n++;
	return n;
};

/**
 * The candidate that matches `subject` (an alert or a statement line; candidates are the other side),
 * or null. The first tier with a match wins: 1) installment `01/N`: the alert equals the cuota or the cuota
 * times N within 1%; 2) the exact amount; 3) pesos only: within 15% and compatible merchant names (one a
 * prefix of the other). Inside a tier: the nearest day, then the longest common merchant prefix, then the
 * lowest id. Only `01/N` installment lines can match.
 */
export function pickMatch<C extends Candidate>(
	subject: Side,
	subjectIs: 'alert' | 'line',
	currency: Currency,
	candidates: C[]
): C | null {
	let best: { c: C; key: [number, number, number] } | null = null;
	for (const c of candidates) {
		const [alert, line] = subjectIs === 'alert' ? [subject, c] : [c, subject];
		if (line.installment && !line.installment.startsWith('01/')) continue;
		const offset = dayNumber(alert.day) - dayNumber(line.day);
		if (offset < -MATCH_DAYS_BEFORE || offset > MATCH_DAYS_AFTER) continue;

		const n = Number(line.installment?.slice(3));
		const total = line.amount * n;
		const prefix = commonPrefix(alert.merchant, line.merchant);
		const compatible =
			prefix > 0 && prefix === Math.min(alert.merchant.length, line.merchant.length);
		const tier =
			line.installment &&
			(alert.amount === line.amount ||
				Math.abs(alert.amount - total) * 100 <= INSTALLMENT_TOTAL_TOLERANCE_PCT * total)
				? 1
				: alert.amount === line.amount
					? 2
					: currency === 'ARS' &&
						  compatible &&
						  Math.abs(alert.amount - line.amount) * 100 <= ARS_AMOUNT_TOLERANCE_PCT * line.amount
						? 3
						: 0;
		if (tier === 0) continue;

		const key: [number, number, number] = [tier, Math.abs(offset), -prefix];
		const order = best
			? key[0] - best.key[0] ||
				key[1] - best.key[1] ||
				key[2] - best.key[2] ||
				(c.id < best.c.id ? -1 : 1)
			: -1;
		if (order < 0) best = { c, key };
	}
	return best?.c ?? null;
}

/** Whether `key` is already an item's external key or alias key of the user (`mine` is their ownership filter). */
async function keyTaken(mine: SQL, key: string): Promise<boolean> {
	const found = await db
		.select({ id: mpImportItems.id })
		.from(mpImportItems)
		.where(and(mine, or(eq(mpImportItems.aliasKey, key), eq(mpImportItems.externalKey, key))))
		.limit(1);
	return found.length > 0;
}

const cleaned = (source: SourceId, merchant: string | null) =>
	importSource(source).merchantName(merchant).toLowerCase();

type StatementLineRow = { key: string; line: StatementLine; row: ImportRow };

/**
 * Before a statement's rows are inserted: matches each consumo line with a waiting alert item of the same
 * network (same currency), storing the line's key as the alert item's `alias_key`. A pending alert item
 * takes the line's amount; an approved or rejected one gets a "Diferencia con el resumen" row for the
 * difference. Returns the rows still to import (matched lines create nothing) and the difference rows.
 * A re-upload matches nothing new and its difference rows already exist.
 */
export async function matchStatement(
	userId: string,
	source: SourceId,
	closing: string,
	lines: StatementLineRow[]
): Promise<{ rows: ImportRow[]; diffs: ImportRow[] }> {
	const keys = lines.map((l) => l.key);
	const mine = canAccessOwn(userId, mpImportItems);
	const existing = new Set<string>();
	const aliased = new Set<string>();
	for (const batch of batches(keys)) {
		const found = await db
			.select({ externalKey: mpImportItems.externalKey, aliasKey: mpImportItems.aliasKey })
			.from(mpImportItems)
			.where(
				and(mine, eq(mpImportItems.source, source), inArray(mpImportItems.externalKey, batch))
			);
		for (const f of found) existing.add(f.externalKey);
		const viaAlias = await db
			.select({ aliasKey: mpImportItems.aliasKey })
			.from(mpImportItems)
			.where(and(mine, inArray(mpImportItems.aliasKey, batch)));
		for (const f of viaAlias) aliased.add(f.aliasKey!);
	}

	// Only new debit lines can match: a credit line is a refund, and only the first cuota has an alert.
	const open = lines.filter(
		(l) =>
			!existing.has(l.key) &&
			!aliased.has(l.key) &&
			l.line.cents > 0 &&
			(!l.line.installment || l.line.installment.startsWith('01/'))
	);
	const matched = new Set<string>();
	if (open.length > 0) {
		const days = open.map((l) => l.line.date).sort();
		const from = dayStart(shiftDay(days[0], -MATCH_DAYS_BEFORE))!;
		const to = dayStart(shiftDay(days[days.length - 1], MATCH_DAYS_AFTER + 1))!;
		const rows = await db
			.select({
				id: mpImportItems.id,
				occurredAt: mpImportItems.occurredAt,
				amount: mpImportItems.amount,
				merchant: mpImportItems.merchant,
				currency: financialAccounts.currency
			})
			.from(mpImportItems)
			.innerJoin(financialAccounts, eq(financialAccounts.id, mpImportItems.accountId))
			.where(
				and(
					mine,
					canAccessAccount(userId),
					eq(mpImportItems.source, source),
					like(mpImportItems.externalKey, ALERT_KEYS),
					eq(mpImportItems.kind, KIND.cardPurchase),
					isNull(mpImportItems.aliasKey),
					gte(mpImportItems.occurredAt, from),
					lt(mpImportItems.occurredAt, to)
				)
			);
		let pool = rows.map((r) => ({
			id: r.id,
			day: localDay(r.occurredAt),
			amount: r.amount,
			merchant: cleaned(source, r.merchant),
			currency: r.currency as Currency
		}));
		for (const l of open) {
			const found = pickMatch(
				{
					day: l.line.date,
					amount: l.line.cents,
					merchant: cleaned(source, l.line.reference),
					installment: l.line.installment
				},
				'line',
				l.line.currency,
				pool.filter((c) => c.currency === l.line.currency)
			);
			if (!found) continue;
			pool = pool.filter((c) => c.id !== found.id);
			const claimed = await db.transaction(async (tx) => {
				const [row] = await tx
					.update(mpImportItems)
					.set({ aliasKey: l.key })
					.where(and(eq(mpImportItems.id, found.id), mine, isNull(mpImportItems.aliasKey)))
					.returning({ id: mpImportItems.id });
				if (!row) return false;
				// A pending alert item becomes what the statement says (the cuota, for an installment).
				await tx
					.update(mpImportItems)
					.set({
						amount: l.line.cents,
						...(l.line.installment ? { installment: l.line.installment } : {})
					})
					.where(and(eq(mpImportItems.id, found.id), mine, eq(mpImportItems.status, 'pending')));
				return true;
			});
			// A lost claim: if the line is meanwhile an alias (or an item), it must not be imported again.
			if (claimed || (await keyTaken(mine, l.key))) matched.add(l.key);
		}
	}

	// Lines aliased now or in an earlier upload: a reviewed item keeps its amount, the difference is its own item.
	const diffs: ImportRow[] = [];
	const byKey = new Map(lines.map((l) => [l.key, l]));
	for (const batch of batches([...aliased, ...matched])) {
		const items = await db
			.select({
				aliasKey: mpImportItems.aliasKey,
				status: mpImportItems.status,
				amount: mpImportItems.amount,
				accountId: mpImportItems.accountId,
				merchant: mpImportItems.merchant,
				rawDescription: mpImportItems.rawDescription
			})
			.from(mpImportItems)
			.where(and(mine, inArray(mpImportItems.aliasKey, batch)));
		for (const item of items) {
			const line = byKey.get(item.aliasKey!)!;
			const d = line.line.cents - item.amount;
			if (item.status === 'pending' || d === 0) continue;
			diffs.push({
				accountId: item.accountId,
				externalKey: diffKey(line.key),
				kind: KIND.cardAdjustment,
				occurredAt: dayStart(closing)!,
				amount: Math.abs(d),
				isCredit: d < 0,
				sourceId: null,
				rawDescription: item.rawDescription,
				merchant: item.merchant
			});
		}
	}

	return {
		rows: lines.filter((l) => !matched.has(l.key) && !aliased.has(l.key)).map((l) => l.row),
		diffs
	};
}

/**
 * The reverse order: for alerts whose statement is already imported, the statement item (a purchase, or
 * the first cuota) of the same network, same currency and rule of matchStatement. The alert creates no
 * item: its key becomes the statement item's `alias_key` and `card_alerts.import_item_id` points at it.
 * Returns the message ids consumed. No difference item: the statement item already has the statement amount.
 */
export async function matchWaitingAlerts(
	userId: string,
	source: SourceId,
	alerts: {
		messageId: string;
		currency: Currency;
		amount: number;
		merchant: string;
		receivedAt: Date;
	}[]
): Promise<Set<string>> {
	const consumed = new Set<string>();
	if (alerts.length === 0) return consumed;
	const mine = canAccessOwn(userId, mpImportItems);
	const earliest = alerts.map((a) => localDay(a.receivedAt)).sort()[0];
	const rows = await db
		.select({
			id: mpImportItems.id,
			externalKey: mpImportItems.externalKey,
			amount: mpImportItems.amount,
			merchant: mpImportItems.merchant,
			installment: mpImportItems.installment,
			currency: financialAccounts.currency
		})
		.from(mpImportItems)
		.innerJoin(financialAccounts, eq(financialAccounts.id, mpImportItems.accountId))
		.where(
			and(
				mine,
				canAccessAccount(userId),
				eq(mpImportItems.source, source),
				like(mpImportItems.externalKey, STATEMENT_KEYS),
				inArray(mpImportItems.kind, [KIND.cardPurchase, KIND.cardInstallment]),
				eq(mpImportItems.isCredit, false),
				isNull(mpImportItems.aliasKey),
				gte(mpImportItems.occurredAt, dayStart(shiftDay(earliest, -MATCH_DAYS_BEFORE))!)
			)
		);
	let pool = rows.map((r) => ({
		id: r.id,
		day: statementPurchaseDay(r.externalKey),
		amount: r.amount,
		merchant: cleaned(source, r.merchant),
		installment: r.installment,
		currency: r.currency as Currency
	}));
	const sorted = [...alerts].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
	for (const a of sorted) {
		const found = pickMatch(
			{ day: localDay(a.receivedAt), amount: a.amount, merchant: cleaned(source, a.merchant) },
			'alert',
			a.currency,
			pool.filter((c) => c.currency === a.currency)
		);
		if (!found) continue;
		pool = pool.filter((c) => c.id !== found.id);
		const claimed = await db.transaction(async (tx) => {
			const [row] = await tx
				.update(mpImportItems)
				.set({ aliasKey: alertKey(a.messageId) })
				.where(and(eq(mpImportItems.id, found.id), mine, isNull(mpImportItems.aliasKey)))
				.returning({ id: mpImportItems.id });
			if (!row) return false;
			await tx
				.update(cardAlerts)
				.set({ importItemId: found.id })
				.where(and(canAccessOwn(userId, cardAlerts), eq(cardAlerts.gmailMessageId, a.messageId)));
			return true;
		});
		if (claimed || (await keyTaken(mine, alertKey(a.messageId)))) consumed.add(a.messageId);
	}
	return consumed;
}
