import { and, asc, eq, gte, isNull, sql } from 'drizzle-orm';
import { canAccessOwn, userOwned } from '../../access';
import { db } from '../../db';
import { cardAlerts, importCards, mpImportItems } from '../../db/schema';
import { activeAccountsIn, getGaliciaConnection, isActiveAccountIn } from '../connections';
import { setGaliciaAccount } from '../galicia/import';
import { matchWaitingAlerts, withMatchLock } from '../galicia/matching';
import { pgErrorCode } from '../../db/errors';
import { type ImportRow, ingestImportItems } from '../ingest';
import { getChosenImportFrom } from '../settings';
import { GALICIA_SOURCE, KIND, SOURCE, type SourceId } from '../sources';
import type { Currency } from '#lib/money.ts';

export type CardType = 'credit' | 'debit';
export type CardInput = {
	network: string;
	last4: string;
	type: string;
	arsAccountId: string;
	usdAccountId: string;
};
export type CardErrors = Partial<Record<'type' | 'arsAccountId' | 'usdAccountId', string>>;

const PURCHASE = 'Compra';

/**
 * Turns the waiting alerts of the user's cards into pending items of the account for the alert currency (a
 * USD alert goes to the dollar account as it is), then links each alert to its item. A debit card's items
 * use the card's accounts; a credit card's use the Banco Galicia accounts, the same its statements land on,
 * and a purchase whose statement line was already imported creates nothing (it is matched to that item).
 * Unknown cards create nothing. The only caller of ingestImportItems for Gmail alerts.
 */
export const convertWaitingAlerts = (userId: string) =>
	withMatchLock(userId, () => convertLocked(userId));

async function convertLocked(userId: string) {
	// Alerts before the chosen "Importar desde" wait unconverted (a trim stays trimmed); an earlier date converts them.
	const floor = await getChosenImportFrom(userId);
	const fromFloor = floor ? gte(cardAlerts.receivedAt, floor) : undefined;
	const waiting = await db
		.select({
			messageId: cardAlerts.gmailMessageId,
			currency: cardAlerts.currency,
			amount: cardAlerts.amount,
			merchant: cardAlerts.merchant,
			transactionType: cardAlerts.transactionType,
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
	if (waiting.length === 0) return { created: 0, autoApproved: 0 };

	const galicia = waiting.some((a) => a.type === 'credit')
		? await getGaliciaConnection(userId)
		: undefined;
	// Statement first, alert later: the statement item already stands for the purchase.
	// A failure here must not block the debit conversion: the credit alerts just wait for the next run.
	let matched = new Set<string>();
	let creditFailed = false;
	try {
		matched = await matchWaitingAlerts(
			userId,
			GALICIA_SOURCE.visa,
			waiting
				.filter((a) => a.type === 'credit' && a.transactionType === PURCHASE)
				.map((a) => ({ ...a, currency: a.currency as Currency }))
		);
	} catch (e) {
		creditFailed = true;
		console.error('[gmail] credit alert matching failed', pgErrorCode(e) ?? 'unknown');
	}

	// Only the user's own active accounts can receive an item.
	const [ars, usd] = await Promise.all([
		activeAccountsIn(userId, 'ARS'),
		activeAccountsIn(userId, 'USD')
	]);
	const usable = new Set([...ars, ...usd].map((a) => a.id));
	const rowsBySource = new Map<SourceId, ImportRow[]>();
	for (const a of waiting) {
		if (matched.has(a.messageId)) continue;
		// Without a matching result, a credit purchase must not be inserted next to a statement item.
		if (creditFailed && a.type === 'credit' && a.transactionType === PURCHASE) continue;
		const accounts = a.type === 'credit' ? galicia : a;
		const accountId = a.currency === 'ARS' ? accounts?.arsAccountId : accounts?.usdAccountId;
		if (!accountId || !usable.has(accountId)) continue;
		const source = a.type === 'credit' ? GALICIA_SOURCE.visa : SOURCE.visaDebit;
		const rows = rowsBySource.get(source) ?? [];
		rowsBySource.set(source, rows);
		rows.push({
			externalKey: `alert:${a.messageId}`,
			accountId,
			kind: a.transactionType === PURCHASE ? KIND.cardPurchase : KIND.other,
			occurredAt: a.receivedAt,
			amount: a.amount,
			isCredit: false,
			sourceId: a.messageId,
			rawDescription: a.merchant,
			merchant: a.merchant
		});
	}
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
			importItemId: sql`(select ${mpImportItems.id} from ${mpImportItems} where ${mpImportItems.userId} = ${cardAlerts.userId} and ${mpImportItems.externalKey} = 'alert:' || ${cardAlerts.gmailMessageId})`
		})
		.where(and(canAccessOwn(userId, cardAlerts), isNull(cardAlerts.importItemId), fromFloor));
	return result;
}

/** Cards that sent alerts but have no card row yet: the user still has to say what they are. */
export function listUnknownCards(userId: string) {
	return db
		.selectDistinct({ network: cardAlerts.network, last4: cardAlerts.last4 })
		.from(cardAlerts)
		.leftJoin(
			importCards,
			and(
				eq(importCards.userId, cardAlerts.userId),
				eq(importCards.network, cardAlerts.network),
				eq(importCards.last4, cardAlerts.last4)
			)
		)
		.where(and(canAccessOwn(userId, cardAlerts), isNull(importCards.id)))
		.orderBy(asc(cardAlerts.last4));
}

export function listCards(userId: string) {
	return db
		.select({ network: importCards.network, last4: importCards.last4, type: importCards.type })
		.from(importCards)
		.where(canAccessOwn(userId, importCards))
		.orderBy(asc(importCards.network), asc(importCards.last4));
}

/**
 * The saved card's settings (`type` null while it is still unknown), or null when the user has neither a
 * card row nor an alert for it: a card is never created for an arbitrary number.
 */
export async function getCard(userId: string, network: string, last4: string) {
	const [card] = await db
		.select({
			type: importCards.type,
			arsAccountId: importCards.arsAccountId,
			usdAccountId: importCards.usdAccountId
		})
		.from(importCards)
		.where(
			and(
				canAccessOwn(userId, importCards),
				eq(importCards.network, network),
				eq(importCards.last4, last4)
			)
		)
		.limit(1);
	if (card) return card;
	const [alert] = await db
		.select({ id: cardAlerts.id })
		.from(cardAlerts)
		.where(
			and(
				canAccessOwn(userId, cardAlerts),
				eq(cardAlerts.network, network),
				eq(cardAlerts.last4, last4)
			)
		)
		.limit(1);
	return alert ? { type: null, arsAccountId: null, usdAccountId: null } : null;
}

/** Saves what a card is and its accounts, then converts the alerts that were waiting for it. */
export async function saveCard(
	userId: string,
	input: CardInput
): Promise<{ ok: true } | { ok: false; errors: CardErrors }> {
	if (input.network !== 'visa' || !/^\d{4}$/.test(input.last4)) return { ok: false, errors: {} };
	if (!(await getCard(userId, input.network, input.last4))) return { ok: false, errors: {} };
	const errors: CardErrors = {};
	if (input.type !== 'credit' && input.type !== 'debit') errors.type = 'Elegí crédito o débito.';
	const { arsAccountId, usdAccountId } = input;
	// A credit card's accounts are the Banco Galicia ones, so the pesos account is required for both types.
	if (!arsAccountId || !(await isActiveAccountIn(userId, 'ARS', arsAccountId)))
		errors.arsAccountId = 'Elegí una cuenta en pesos.';
	if (usdAccountId && !(await isActiveAccountIn(userId, 'USD', usdAccountId)))
		errors.usdAccountId = 'Elegí una cuenta en dólares.';
	if (Object.keys(errors).length > 0) return { ok: false, errors };

	const values = {
		type: input.type,
		arsAccountId: arsAccountId || null,
		usdAccountId: usdAccountId || null
	};
	await db
		.insert(importCards)
		.values({ ...userOwned(userId), network: input.network, last4: input.last4, ...values })
		.onConflictDoUpdate({
			target: [importCards.userId, importCards.network, importCards.last4],
			set: values
		});
	if (input.type === 'credit') {
		await setGaliciaAccount(userId, 'ARS', arsAccountId);
		if (usdAccountId) await setGaliciaAccount(userId, 'USD', usdAccountId);
	}
	await convertWaitingAlerts(userId);
	return { ok: true };
}
