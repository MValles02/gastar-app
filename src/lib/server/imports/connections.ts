import { and, eq, isNull } from 'drizzle-orm';
import type { Currency } from '#lib/money.ts';
import { canAccessAccount, canAccessOwn } from '../access';
import { accountOption } from '../accounts/queries';
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

/**
 * The home imports pill: pending items in both currencies, for a user with a source set up (Mercado
 * Pago linked, also while a reconnect is pending, a Banco Galicia account chosen, or Gmail linked with
 * at least one configured card); else null.
 */
export async function importsPending(userId: string): Promise<number | null> {
	const [status, galicia] = await Promise.all([sourceStatus(userId), getGaliciaConnection(userId)]);
	const l = linkedSources(status, galicia);
	return l.mp || l.galicia || (l.gmail && (await hasGmailCards(userId)))
		? await pendingImportCount(userId)
		: null;
}

/** Which import sources the user has set up: Mercado Pago once it feeds an account (also while a reconnect is pending), Banco Galicia once its pesos account is chosen, Gmail once linked. */
export const linkedSources = (
	status: Awaited<ReturnType<typeof sourceStatus>>,
	galicia: Awaited<ReturnType<typeof getGaliciaConnection>>
) => ({
	mp: !!status.mp?.accountId,
	galicia: !!galicia?.arsAccountId,
	gmail: !!status.gmail?.state
});

/** The user's active pesos and dollar accounts as picker options. */
export async function currencyAccountOptions(userId: string) {
	const [ars, usd] = await Promise.all([
		activeAccountsIn(userId, 'ARS'),
		activeAccountsIn(userId, 'USD')
	]);
	return { arsAccounts: ars.map(accountOption), usdAccounts: usd.map(accountOption) };
}

async function hasGmailCards(userId: string) {
	const [card] = await db
		.select({ id: importCards.id })
		.from(importCards)
		.where(canAccessOwn(userId, importCards))
		.limit(1);
	return !!card;
}
