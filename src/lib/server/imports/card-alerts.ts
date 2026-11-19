import { and, asc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { canAccessOwn, userOwned } from '../access';
import { db } from '../db';
import { cardAlerts, importCards, importItems } from '../db/schema';
import { pgErrorCode } from '../db/errors';
import { activeAccountsIn, isActiveAccountIn } from './connections';
import { getGaliciaConnection, setGaliciaAccount } from './galicia/connection';
import { matchWaitingAlerts } from './galicia/matching';
import { type ImportRow, ingestImportItems } from './ingest';
import { alertKey, alertKeySql } from './keys';
import { withMatchLock } from './match-lock';
import { getChosenImportFrom } from './settings';
import { GALICIA_SOURCE, KIND, SOURCE, type SourceId } from './sources';
import { CURRENCIES, CURRENCY_NAME, type Currency } from '#lib/money.ts';
import {
	CARD_NETWORKS,
	CREDIT_ONLY_NETWORKS,
	type CardNetwork,
	isCardNetwork
} from '#lib/imports.ts';

export type { CardType } from '#lib/imports.ts';
export type CardInput = {
	network: string;
	last4: string;
	type: string;
	arsAccountId: string;
	usdAccountId: string;
};
export type CardErrors = Partial<Record<'type' | 'arsAccountId' | 'usdAccountId', string>>;

const PURCHASE = 'Compra';

/** The error of an account picker that needs an active account of that currency (Galicia, Mercado Pago, card pages). */
export const ACCOUNT_ERRORS = Object.fromEntries(
	CURRENCIES.map((c) => [c, `Elegí una cuenta en ${CURRENCY_NAME[c]}.`])
) as Record<Currency, string>;

/** A card's URL segment: `visa-0515`, `mastercard-3374`. */
export const cardSlug = (network: string, last4: string) => `${network}-${last4}`;

/** `visa-0515` into its network and last 4; null for anything else. */
export function parseCardSlug(param: string) {
	const m = /^([a-z]+)-(\d{4})$/.exec(param);
	return m && isCardNetwork(m[1]) ? { network: m[1], last4: m[2] } : null;
}

/** Whether a card of this network can only be saved as credit (no debit option). */
export const creditOnly = (network: string) =>
	(CREDIT_ONLY_NETWORKS as readonly string[]).includes(network);

const withSlug = <T extends { network: string; last4: string }>(rows: T[]) =>
	rows.map((r) => ({ ...r, slug: cardSlug(r.network, r.last4) }));

/**
 * Turns the waiting alerts of the user's cards into pending items of the account for the alert currency (a
 * USD alert goes to the dollar account as it is), then links each alert to its item. A debit card's items
 * use the card's accounts; a credit card's use the Banco Galicia accounts, the same its statements land on
 * (the Galicia source of the alert's network), and a purchase whose statement line was already imported
 * creates nothing (it is matched to that item). Unknown cards create nothing, and neither do alerts of more
 * than one installment (cuotas): they are stored and wait. The only caller of ingestImportItems for Gmail alerts.
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
			network: cardAlerts.network,
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
				fromFloor,
				// An installment purchase (cuotas > 1) is not one item of its full amount: it is stored but waits
				// unconverted for installment support (phase 2 turns it into a fixed payment with an end).
				or(isNull(cardAlerts.installments), eq(cardAlerts.installments, 1))
			)
		);
	if (waiting.length === 0) return { created: 0, autoApproved: 0 };

	const galicia = waiting.some((a) => a.type === 'credit')
		? await getGaliciaConnection(userId)
		: undefined;
	// Statement first, alert later: the statement item already stands for the purchase.
	// A failure here must not block the debit conversion: the credit alerts just wait for the next run.
	// Each network matches against its own Galicia statement source.
	const matched = new Set<string>();
	const creditFailed = new Set<string>();
	for (const network of CARD_NETWORKS) {
		const purchases = waiting.filter(
			(a) => a.type === 'credit' && a.network === network && a.transactionType === PURCHASE
		);
		if (purchases.length === 0) continue;
		try {
			const ids = await matchWaitingAlerts(
				userId,
				GALICIA_SOURCE[network],
				purchases.map((a) => ({ ...a, currency: a.currency as Currency }))
			);
			for (const id of ids) matched.add(id);
		} catch (e) {
			creditFailed.add(network);
			console.error('[gmail] credit alert matching failed', pgErrorCode(e) ?? 'unknown');
		}
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
		if (a.type === 'credit' && a.transactionType === PURCHASE && creditFailed.has(a.network))
			continue;
		const accounts = a.type === 'credit' ? galicia : a;
		const accountId = a.currency === 'ARS' ? accounts?.arsAccountId : accounts?.usdAccountId;
		if (!accountId || !usable.has(accountId)) continue;
		const network: CardNetwork = isCardNetwork(a.network) ? a.network : 'visa';
		// Only a Visa card can be debit (see saveCard).
		const source = a.type === 'credit' ? GALICIA_SOURCE[network] : SOURCE.visaDebit;
		const rows = rowsBySource.get(source) ?? [];
		rowsBySource.set(source, rows);
		rows.push({
			externalKey: alertKey(a.messageId),
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
		.orderBy(asc(cardAlerts.last4))
		.then(withSlug);
}

export function listCards(userId: string) {
	return db
		.select({ network: importCards.network, last4: importCards.last4, type: importCards.type })
		.from(importCards)
		.where(canAccessOwn(userId, importCards))
		.orderBy(asc(importCards.network), asc(importCards.last4))
		.then(withSlug);
}

/**
 * The saved card's settings (`type` null while it is still unknown), or null when the user has neither a
 * card row nor an alert for it: a card is never created for an arbitrary number.
 */
async function getCard(userId: string, network: string, last4: string) {
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

/**
 * The card form's start values, or null when the card is not one of the user's (see getCard). A credit
 * card's accounts are the Banco Galicia ones; a card not saved yet starts from them too.
 */
export async function getCardForm(userId: string, network: string, last4: string) {
	const card = await getCard(userId, network, last4);
	if (!card) return null;
	const galicia = await getGaliciaConnection(userId);
	const accounts = card.type === 'credit' ? galicia : card;
	return {
		type: card.type ?? (creditOnly(network) ? 'credit' : ''),
		arsAccountId: accounts?.arsAccountId ?? galicia?.arsAccountId ?? '',
		usdAccountId: accounts?.usdAccountId ?? galicia?.usdAccountId ?? ''
	};
}

/** Saves the Banco Galicia pesos or dollar account, then converts the credit alerts that waited for it. */
export async function chooseGaliciaAccount(userId: string, currency: Currency, accountId: string) {
	if (!(await setGaliciaAccount(userId, currency, accountId))) return false;
	await convertWaitingAlerts(userId);
	return true;
}

/** Saves what a card is and its accounts, then converts the alerts that were waiting for it. */
export async function saveCard(
	userId: string,
	input: CardInput
): Promise<{ ok: true } | { ok: false; errors: CardErrors }> {
	if (!isCardNetwork(input.network) || !/^\d{4}$/.test(input.last4))
		return { ok: false, errors: {} };
	if (!(await getCard(userId, input.network, input.last4))) return { ok: false, errors: {} };
	const errors: CardErrors = {};
	if (creditOnly(input.network)) {
		if (input.type !== 'credit') errors.type = 'Esta tarjeta solo puede ser de crédito.';
	} else if (input.type !== 'credit' && input.type !== 'debit') {
		errors.type = 'Elegí crédito o débito.';
	}
	const { arsAccountId, usdAccountId } = input;
	// A credit card's accounts are the Banco Galicia ones, so the pesos account is required for both types.
	if (!arsAccountId || !(await isActiveAccountIn(userId, 'ARS', arsAccountId)))
		errors.arsAccountId = ACCOUNT_ERRORS.ARS;
	if (usdAccountId && !(await isActiveAccountIn(userId, 'USD', usdAccountId)))
		errors.usdAccountId = ACCOUNT_ERRORS.USD;
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
