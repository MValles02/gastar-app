import { and, asc, eq, isNull } from 'drizzle-orm';
import { canAccessOwn, userOwned } from '../access';
import { db } from '../db';
import { cardAlerts, importCards } from '../db/schema';
import { convertWaitingAlerts } from './card-alerts';
import { ACCOUNT_ERRORS, isActiveAccountIn } from './connections';
import { accountsFor, getGaliciaConnection, setGaliciaAccount } from './galicia/connection';
import type { Currency } from '#lib/money.ts';
import { CARD_NETWORK, isCardNetwork } from '#lib/imports.ts';

export type CardInput = {
	network: string;
	last4: string;
	type: string;
	arsAccountId: string;
	usdAccountId: string;
};
export type CardErrors = Partial<Record<'type' | 'arsAccountId' | 'usdAccountId', string>>;

/** A card's URL segment: `visa-0515`, `mastercard-3374`. */
export const cardSlug = (network: string, last4: string) => `${network}-${last4}`;

/** `visa-0515` into its network and last 4; null for anything else. */
export function parseCardSlug(param: string) {
	const m = /^([a-z]+)-(\d{4})$/.exec(param);
	return m && isCardNetwork(m[1]) ? { network: m[1], last4: m[2] } : null;
}

/** Whether a card of this network can only be saved as credit (no debit option). */
export const creditOnly = (network: string) =>
	isCardNetwork(network) && CARD_NETWORK[network].debit === null;

const withSlug = <T extends { network: string; last4: string }>(rows: T[]) =>
	rows.map((r) => ({ ...r, slug: cardSlug(r.network, r.last4) }));

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
	const accounts = accountsFor(card, galicia);
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
