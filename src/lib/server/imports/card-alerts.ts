import { and, asc, eq, gte, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { canAccessOwn } from '../access';
import { db } from '../db';
import { cardAlerts, importCards, importItems, recurringMovements } from '../db/schema';
import { pgErrorCode } from '../db/errors';
import { currencyAccountOptions } from './connections';
import { accountsFor, getGaliciaConnection } from './galicia/connection';
import { matchWaitingAlerts } from './galicia/matching';
import { type ImportRow, ingestImportItems } from './ingest';
import { alertKey, alertKeySql } from './keys';
import { withMatchLock } from './match-lock';
import { installmentAmounts } from './rules';
import { getChosenImportFrom } from './settings';
import { PURCHASE, REVERSAL } from './gmail/alert-mail';
import type { Currency } from '#lib/money.ts';
import {
	CARD_NETWORK,
	CARD_NETWORKS,
	KIND,
	type CardNetwork,
	type SourceId
} from '#lib/imports.ts';

/**
 * Turns the waiting alerts of the user's cards into pending items of the account for the alert currency (a
 * USD alert goes to the dollar account as it is), then links each alert to its item. A debit card's items
 * use the card's accounts; a credit card's use the Banco Galicia accounts, the same its statements land on
 * (the Galicia source of the alert's network), and a purchase whose statement line was already imported
 * creates nothing (it is matched to that item). Unknown cards create nothing. A purchase in cuotas (N > 1)
 * becomes the item of its first cuota (`installments` = N); approving it creates the fixed payment. The only
 * caller of ingestImportItems for Gmail alerts.
 */
export const convertWaitingAlerts = (userId: string) =>
	withMatchLock(userId, () => convertLocked(userId));

async function convertLocked(userId: string) {
	// Alerts before the chosen "Importar desde" wait unconverted (a trim stays trimmed); an earlier date converts them.
	const floor = await getChosenImportFrom(userId);
	const fromFloor = floor ? gte(cardAlerts.receivedAt, floor) : undefined;
	const waiting = await waitingAlerts(userId, fromFloor);
	if (waiting.length === 0) return { created: 0, autoApproved: 0 };
	const reversals = await settleReversals(userId, waiting);
	const waitingLive = waiting.filter((a) => !reversals.skip.has(a.messageId));

	const galicia = waiting.some((a) => a.type === 'credit')
		? await getGaliciaConnection(userId)
		: undefined;
	const { matched, failed } = await matchCreditPurchases(userId, waitingLive);

	// Only the user's own active accounts can receive an item.
	const { arsAccounts, usdAccounts } = await currencyAccountOptions(userId);
	const usable = new Set([...arsAccounts, ...usdAccounts].map((a) => a.id));
	const rowsBySource = new Map<SourceId, ImportRow[]>();
	const archive: string[] = [];
	for (const a of waitingLive) {
		if (matched.has(a.messageId)) continue;
		// Without a matching result, a credit purchase must not be inserted next to a statement item.
		if (a.type === 'credit' && a.transactionType === PURCHASE && failed.has(a.network)) continue;
		const accounts = accountsFor(a, galicia);
		const accountId = a.currency === 'ARS' ? accounts?.arsAccountId : accounts?.usdAccountId;
		if (!accountId || !usable.has(accountId)) continue;
		const source =
			a.type === 'credit'
				? CARD_NETWORK[a.network].credit.source
				: CARD_NETWORK[a.network].debit?.source;
		if (!source) continue;
		const rows = rowsBySource.get(source) ?? [];
		rowsBySource.set(source, rows);
		// A reversal left here is money back: a credit of the card purchase kind (it learns nothing).
		const refund = reversals.credit.has(a.messageId);
		const cuotas =
			a.type === 'credit' && a.transactionType === PURCHASE && !refund ? (a.installments ?? 1) : 1;
		// A reversal of an approved installment purchase gives back the booked first cuota and ends its fixed payment.
		const booked = reversals.booked.get(a.messageId);
		if (booked?.recurringId) archive.push(booked.recurringId);
		rows.push({
			externalKey: alertKey(a.messageId),
			accountId,
			kind: a.transactionType === PURCHASE || refund ? KIND.cardPurchase : KIND.other,
			occurredAt: a.receivedAt,
			amount:
				booked?.amount ??
				(cuotas > 1
					? installmentAmounts(a.amount, cuotas, a.currency as Currency).first
					: a.amount),
			installments: cuotas > 1 ? cuotas : null,
			isCredit: refund,
			sourceId: a.messageId,
			rawDescription: a.merchant,
			merchant: a.merchant
		});
	}
	if (archive.length > 0)
		await db
			.update(recurringMovements)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(
				and(
					canAccessOwn(userId, recurringMovements),
					isNull(recurringMovements.archivedAt),
					inArray(recurringMovements.id, archive)
				)
			);
	const result = { created: 0, autoApproved: 0 };
	for (const [source, rows] of rowsBySource) {
		const r = await ingestImportItems(userId, source, rows);
		result.created += r.created;
		result.autoApproved += r.autoApproved;
	}
	// An external key is unique per user, whatever the source.
	await db
		.update(cardAlerts)
		.set({
			importItemId: sql`(select ${importItems.id} from ${importItems} where ${importItems.userId} = ${cardAlerts.userId} and ${importItems.externalKey} = ${alertKeySql(cardAlerts.gmailMessageId)})`
		})
		.where(
			and(
				canAccessOwn(userId, cardAlerts),
				isNull(cardAlerts.importItemId),
				fromFloor,
				inArray(
					cardAlerts.gmailMessageId,
					waiting.map((a) => a.messageId)
				)
			)
		);
	return result;
}

type Waiting = Awaited<ReturnType<typeof waitingAlerts>>[number];

/**
 * Statement first, alert later: a credit purchase whose statement line was already imported is matched to
 * that item (each network against its own Galicia statement source). A failure must not block the debit
 * conversion: the networks whose matching failed come back in `failed` and their credit alerts wait.
 */
async function matchCreditPurchases(userId: string, alerts: Waiting[]) {
	const matched = new Set<string>();
	const failed = new Set<CardNetwork>();
	for (const network of CARD_NETWORKS) {
		const purchases = alerts.filter(
			(a) => a.type === 'credit' && a.network === network && a.transactionType === PURCHASE
		);
		if (purchases.length === 0) continue;
		try {
			const ids = await matchWaitingAlerts(userId, CARD_NETWORK[network].credit.source, purchases);
			for (const id of ids) matched.add(id);
		} catch (e) {
			failed.add(network);
			console.error('[gmail] credit alert matching failed', pgErrorCode(e) ?? 'unknown');
		}
	}
	return { matched, failed };
}

/**
 * "Compra reversada" alerts of the networks with `reversals` (a cancelled pre-authorization, never on the statement). Each reversal
 * cancels the latest earlier purchase alert of the same card, currency, amount and merchant that no other
 * reversal cancelled. The pairing is recomputed from card_alerts on every run (no column marks it), so:
 * - both unconverted: neither ever converts (both are in `skip` and keep import_item_id null);
 * - the purchase is a pending item of its own alert key, not linked to a statement line: that item is deleted
 *   (as an "Importar desde" trim does), and from then on both are unconverted;
 * - the purchase item was rejected: the reversal creates nothing;
 * - the purchase item was approved (or is a statement line): the reversal becomes a credit item (`credit`);
 *   for an installment purchase it is the booked first cuota (`booked`) and its fixed payment is archived;
 * - no purchase to cancel: the reversal becomes a credit item.
 * Only networks with `reversals` are paired.
 */
async function settleReversals(userId: string, waiting: Waiting[]) {
	const skip = new Set<string>();
	const credit = new Set<string>();
	const booked = new Map<string, { amount: number; recurringId: string | null }>();
	const mine = waiting.filter(
		(a) =>
			CARD_NETWORK[a.network].reversals &&
			(a.transactionType === PURCHASE || a.transactionType === REVERSAL)
	);
	if (mine.length === 0) return { skip, credit, booked };
	const waitingIds = new Set(waiting.map((a) => a.messageId));
	const all = await db
		.select({
			messageId: cardAlerts.gmailMessageId,
			network: cardAlerts.network,
			last4: cardAlerts.last4,
			currency: cardAlerts.currency,
			amount: cardAlerts.amount,
			merchant: cardAlerts.merchant,
			transactionType: cardAlerts.transactionType,
			receivedAt: cardAlerts.receivedAt,
			itemId: importItems.id,
			itemStatus: importItems.status,
			itemKey: importItems.externalKey,
			itemAlias: importItems.aliasKey,
			itemAmount: importItems.amount,
			itemInstallments: importItems.installments,
			itemRecurringId: importItems.recurringId
		})
		.from(cardAlerts)
		.leftJoin(importItems, eq(importItems.id, cardAlerts.importItemId))
		.where(
			and(
				canAccessOwn(userId, cardAlerts),
				inArray(cardAlerts.network, [...new Set(mine.map((a) => a.network))]),
				inArray(cardAlerts.transactionType, [PURCHASE, REVERSAL]),
				inArray(cardAlerts.amount, [...new Set(mine.map((a) => a.amount))])
			)
		)
		.orderBy(asc(cardAlerts.receivedAt), asc(cardAlerts.gmailMessageId));
	type Row = (typeof all)[number];
	const key = (a: Pick<Row, 'network' | 'last4' | 'currency' | 'amount' | 'merchant'>) =>
		[a.network, a.last4, a.currency, a.amount, a.merchant.trim()].join('|');
	const wanted = new Set(mine.map(key));
	const open = new Map<string, Row[]>();
	const toDelete: string[] = [];
	// Chronological, a purchase before a reversal of the same instant: each reversal takes the latest open purchase.
	const ordered = all
		.filter((a) => wanted.has(key(a)))
		.sort(
			(a, b) =>
				a.receivedAt.getTime() - b.receivedAt.getTime() ||
				Number(a.transactionType === REVERSAL) - Number(b.transactionType === REVERSAL)
		);
	for (const a of ordered) {
		const stack = open.get(key(a)) ?? [];
		open.set(key(a), stack);
		if (a.transactionType === PURCHASE) {
			stack.push(a);
			continue;
		}
		const purchase = stack.pop();
		if (purchase && !purchase.itemId) skip.add(purchase.messageId);
		if (!waitingIds.has(a.messageId)) continue;
		if (!purchase) credit.add(a.messageId);
		else if (!purchase.itemId) skip.add(a.messageId);
		else if (
			purchase.itemStatus === 'pending' &&
			purchase.itemKey === alertKey(purchase.messageId) &&
			purchase.itemAlias === null
		) {
			toDelete.push(purchase.itemId);
			skip.add(a.messageId);
		} else if (purchase.itemStatus === 'rejected') skip.add(a.messageId);
		else {
			credit.add(a.messageId);
			if (purchase.itemInstallments)
				booked.set(a.messageId, {
					amount: purchase.itemAmount!,
					recurringId: purchase.itemRecurringId
				});
		}
	}
	if (toDelete.length > 0) {
		await db
			.delete(importItems)
			.where(
				and(
					canAccessOwn(userId, importItems),
					eq(importItems.status, 'pending'),
					isNull(importItems.aliasKey),
					inArray(importItems.id, toDelete)
				)
			);
	}
	return { skip, credit, booked };
}

const waitingAlerts = (userId: string, fromFloor: SQL | undefined) =>
	db
		.select({
			messageId: cardAlerts.gmailMessageId,
			// The DB checks both columns to hold one of these values.
			network: sql<CardNetwork>`${cardAlerts.network}`,
			last4: cardAlerts.last4,
			currency: sql<Currency>`${cardAlerts.currency}`,
			amount: cardAlerts.amount,
			merchant: cardAlerts.merchant,
			transactionType: cardAlerts.transactionType,
			installments: cardAlerts.installments,
			receivedAt: cardAlerts.receivedAt,
			type: importCards.type,
			arsAccountId: importCards.arsAccountId,
			usdAccountId: importCards.usdAccountId
		})
		.from(cardAlerts)
		.innerJoin(
			importCards,
			and(
				eq(importCards.userId, cardAlerts.userId),
				eq(importCards.network, cardAlerts.network),
				eq(importCards.last4, cardAlerts.last4)
			)
		)
		.where(
			and(
				canAccessOwn(userId, cardAlerts),
				canAccessOwn(userId, importCards),
				isNull(cardAlerts.importItemId),
				fromFloor
			)
		);
