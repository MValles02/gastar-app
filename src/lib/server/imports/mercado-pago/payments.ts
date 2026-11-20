import { and, eq, inArray, max } from 'drizzle-orm';
import { db } from '../../db';
import { importItems } from '../../db/schema';
import { canAccessOwn } from '../../access';
import { batches, type ImportRow } from '../ingest';
import { paymentKey, refundKey } from '../keys';
import { backfillStart } from '../settings';
import { KIND } from '#lib/imports.ts';
import { PAYMENT_KINDS } from '../sources';
import { DAY_MS } from '#lib/dates.ts';
import {
	apiJson,
	atLeast,
	type Auth,
	date,
	fail,
	jsonCents,
	obj,
	OVERLAP_DAYS,
	str,
	text,
	isAuthError
} from './client';

// Payments: /v1/payments/search, both sides, in seconds.

const PAYMENTS_OVERLAP_MS = OVERLAP_DAYS * DAY_MS;
const PAGE = 1000; // payments/search max limit

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
 * The items for approved payments, skipping credit-card ones (they never touch the balance).
 * Refunds and chargebacks (seen through date_last_updated) become a separate `refund` item in the
 * opposite direction, but only when the payment is still approved (partial refund) or was already imported
 * and not rejected; a payment refunded before it was ever imported nets to zero and is skipped. A later
 * partial refund grows the amount of the refund item while it is still pending.
 */
export async function syncPayments(
	accountId: string,
	ownerId: string,
	me: string,
	auth: Auth,
	floor: Date | null,
	from?: Date
): Promise<ImportRow[]> {
	const now = Date.now();
	const [last] = await db
		.select({ at: max(importItems.occurredAt) })
		.from(importItems)
		.where(
			and(
				canAccessOwn(ownerId, importItems),
				eq(importItems.accountId, accountId),
				inArray(importItems.kind, PAYMENT_KINDS)
			)
		);
	const begin =
		from ??
		(last?.at
			? atLeast(new Date(last.at.getTime() - PAYMENTS_OVERLAP_MS), floor)
			: backfillStart(now, floor));
	if (!begin) throw fail('config');
	const payments = (await searchPayments(begin, new Date(now), auth)).filter(
		(p) => str(p.payment_type_id) !== 'credit_card'
	);

	const existing = new Map<string, string>();
	const ids = payments.map((p) => str(p.id)).filter((id): id is string => !!id);
	for (const batch of batches(ids)) {
		const found = await db
			.select({ key: importItems.externalKey, status: importItems.status })
			.from(importItems)
			.where(and(canAccessOwn(ownerId, importItems), inArray(importItems.sourceId, batch)));
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
				if (isAuthError(e)) throw e;
			}
			nicknames.set(id, n);
		}
		return nicknames.get(id) ?? null;
	};

	const items: ImportRow[] = [];
	for (const p of payments) {
		const id = str(p.id);
		if (!id) throw fail('parse');
		const payerId = str(obj(p.payer).id) ?? str(p.payer_id);
		const collectorId = str(p.collector_id) ?? str(obj(p.collector).id);
		const isCredit = collectorId === me;
		if (!isCredit && payerId !== me) continue;
		const key = paymentKey(id, isCredit);
		const refundOf = refundKey(id, isCredit);
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
			existing.get(refundOf) !== 'approved' &&
			existing.get(refundOf) !== 'rejected';
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
			accountId,
			sourceId: id,
			counterpartyId,
			counterpartyNickname: nick,
			merchant: merchantOf(p),
			operationType,
			poiType: str(obj(p.point_of_interaction).type)
		};
		if (wantMain)
			items.push({
				...base,
				externalKey: key,
				kind: operationType === 'account_fund' ? KIND.accountFund : KIND.payment,
				occurredAt: date(p.date_approved ?? p.date_created),
				amount,
				isCredit,
				rawDescription: text(p.description) ?? operationType ?? 'payment'
			});
		if (wantRefund)
			items.push({
				...base,
				externalKey: refundOf,
				kind: KIND.refund,
				occurredAt: date(p.date_last_updated),
				amount: refunded,
				isCredit: !isCredit,
				rawDescription: status ?? 'refund'
			});
	}
	return items;
}
