import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { canAccessOwn, userOwned } from '../../access';
import { db } from '../../db';
import { cardAlerts, importCards, mpImportItems } from '../../db/schema';
import { activeAccountsIn, isActiveAccountIn } from '../connections';
import { type ImportRow, ingestImportItems } from '../ingest';
import { KIND, SOURCE } from '../sources';

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
 * Turns the waiting alerts of the user's debit cards into pending items of the card's account for the alert
 * currency (a USD alert goes to the dollar account as it is), then links each alert to its item. Credit
 * cards and unknown cards create nothing. The only caller of ingestImportItems for Gmail alerts.
 */
export async function convertWaitingAlerts(userId: string) {
	const waiting = await db
		.select({
			messageId: cardAlerts.gmailMessageId,
			currency: cardAlerts.currency,
			amount: cardAlerts.amount,
			merchant: cardAlerts.merchant,
			transactionType: cardAlerts.transactionType,
			receivedAt: cardAlerts.receivedAt,
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
				eq(importCards.type, 'debit')
			)
		);
	if (waiting.length === 0) return { created: 0, autoApproved: 0 };

	// Only the user's own active accounts can receive an item.
	const [ars, usd] = await Promise.all([
		activeAccountsIn(userId, 'ARS'),
		activeAccountsIn(userId, 'USD')
	]);
	const usable = new Set([...ars, ...usd].map((a) => a.id));
	const rows: ImportRow[] = [];
	for (const a of waiting) {
		const accountId = a.currency === 'ARS' ? a.arsAccountId : a.usdAccountId;
		if (!accountId || !usable.has(accountId)) continue;
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
	if (rows.length === 0) return { created: 0, autoApproved: 0 };

	const result = await ingestImportItems(userId, SOURCE.visaDebit, rows);
	await db
		.update(cardAlerts)
		.set({
			importItemId: sql`(select ${mpImportItems.id} from ${mpImportItems} where ${mpImportItems.userId} = ${cardAlerts.userId} and ${mpImportItems.source} = ${SOURCE.visaDebit} and ${mpImportItems.externalKey} = 'alert:' || ${cardAlerts.gmailMessageId})`
		})
		.where(and(canAccessOwn(userId, cardAlerts), isNull(cardAlerts.importItemId)));
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
	if (
		arsAccountId ? !(await isActiveAccountIn(userId, 'ARS', arsAccountId)) : input.type === 'debit'
	)
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
	await convertWaitingAlerts(userId);
	return { ok: true };
}
