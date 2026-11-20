import { and, eq, isNull } from 'drizzle-orm';
import { CURRENCIES, CURRENCY_NAME, type Currency } from '#lib/money.ts';
import { canAccessAccount, canAccessOwn } from '../access';
import { db } from '../db';
import { isUuid } from '../db/util';
import { financialAccounts, importCards } from '../db/schema';
import { sourceStatus } from './automatic';
import { getGaliciaConnection } from './galicia/connection';
import { pendingImportCount } from './store';

/** The user's active accounts of one currency, by name: the only ones an import source can feed. */
export function activeAccountsIn(userId: string, currency: Currency) {
	return db
		.select({
			id: financialAccounts.id,
			name: financialAccounts.name,
			icon: financialAccounts.icon,
			color: financialAccounts.color
		})
		.from(financialAccounts)
		.where(activeIn(userId, currency))
		.orderBy(financialAccounts.name);
}

const activeIn = (userId: string, currency: Currency) =>
	and(
		canAccessAccount(userId),
		eq(financialAccounts.currency, currency),
		isNull(financialAccounts.archivedAt)
	);

/** True when `accountId` is one of the user's active accounts of that currency. */
export async function isActiveAccountIn(userId: string, currency: Currency, accountId: string) {
	if (!isUuid(accountId)) return false;
	const [row] = await db
		.select({ id: financialAccounts.id })
		.from(financialAccounts)
		.where(and(eq(financialAccounts.id, accountId), activeIn(userId, currency)))
		.limit(1);
	return !!row;
}

/** The error of an account picker that needs an active account of that currency (Galicia, Mercado Pago, card pages). */
export const ACCOUNT_ERRORS = Object.fromEntries(
	CURRENCIES.map((c) => [c, `Elegí una cuenta en ${CURRENCY_NAME[c]}.`])
) as Record<Currency, string>;

/**
 * The home imports pill: pending items in both currencies, for a user with a source set up (Mercado
 * Pago linked, also while a reconnect is pending, a Banco Galicia account chosen, or Gmail linked with
 * at least one configured card); else null.
 */
export async function importsPending(userId: string): Promise<number | null> {
	const [{ mp, gmail }, galicia] = await Promise.all([
		sourceStatus(userId),
		getGaliciaConnection(userId)
	]);
	return mp?.accountId || galicia?.arsAccountId || (gmail?.state && (await hasGmailCards(userId)))
		? await pendingImportCount(userId)
		: null;
}

async function hasGmailCards(userId: string) {
	const [card] = await db
		.select({ id: importCards.id })
		.from(importCards)
		.where(canAccessOwn(userId, importCards))
		.limit(1);
	return !!card;
}
