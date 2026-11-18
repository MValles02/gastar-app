import { and, eq, isNull } from 'drizzle-orm';
import type { Currency } from '#lib/money.ts';
import { canAccessAccount, canAccessOwn } from '../access';
import { db } from '../db';
import { isUuid } from '../db/util';
import { financialAccounts, gmailConnections, importCards, mpConnections } from '../db/schema';
import { getGaliciaConnection } from './galicia/connection';
import { gmailOauthEnabled } from './gmail/oauth';
import { mpOauthEnabled } from './mercado-pago/oauth';
import { pendingImportCount } from './store';

// The profile Vinculaciones page still reads it from here.
export { getGaliciaConnection };

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

type MpConnectionInfo = {
	accountId: string | null;
	accountName: string | null;
	needsReconnect: boolean;
};

/** The user's Mercado Pago connection without any token, or null when not linked. */
export async function getConnectionInfo(userId: string): Promise<MpConnectionInfo | null> {
	const [row] = await db
		.select({
			accountId: mpConnections.accountId,
			accountName: financialAccounts.name,
			needsReconnect: mpConnections.needsReconnect
		})
		.from(mpConnections)
		.leftJoin(financialAccounts, eq(financialAccounts.id, mpConnections.accountId))
		.where(canAccessOwn(userId, mpConnections))
		.limit(1);
	return row ?? null;
}

const importAccountOf = (conn: MpConnectionInfo | null) =>
	conn?.accountId ? { id: conn.accountId, name: conn.accountName ?? '' } : null;

/** The account the user's Mercado Pago connection feeds (also while a reconnect is pending), else null. */
export const getMpImportAccount = async (userId: string) =>
	importAccountOf(await getConnectionInfo(userId));

/** How the user's Mercado Pago connection stands: linked, needing a reconnect, or not linked. */
export async function mpLinkState(userId: string): Promise<'linked' | 'reconnect' | 'unlinked'> {
	const conn = await getConnectionInfo(userId);
	if (conn?.needsReconnect) return 'reconnect';
	if (conn?.accountId) return 'linked';
	return 'unlinked';
}

/**
 * The home imports pill: pending items in both currencies, for a user with a source set up (Mercado
 * Pago linked, also while a reconnect is pending, a Banco Galicia account chosen, or Gmail linked with
 * at least one configured card); else null.
 */
export async function importsPending(userId: string): Promise<number | null> {
	return (mpOauthEnabled() && (await getMpImportAccount(userId))) ||
		(await getGaliciaConnection(userId))?.arsAccountId ||
		(gmailOauthEnabled() && (await hasGmailCards(userId)))
		? await pendingImportCount(userId)
		: null;
}

async function hasGmailCards(userId: string) {
	const [[conn], [card]] = await Promise.all([
		db
			.select({ id: gmailConnections.userId })
			.from(gmailConnections)
			.where(canAccessOwn(userId, gmailConnections))
			.limit(1),
		db
			.select({ id: importCards.id })
			.from(importCards)
			.where(canAccessOwn(userId, importCards))
			.limit(1)
	]);
	return !!conn && !!card;
}

/**
 * Both sources of one user: the Mercado Pago connection (and the account it feeds) and whether Banco
 * Galicia has its pesos account, the one every statement needs.
 */
export async function importLinks(userId: string) {
	const [mp, galicia] = await Promise.all([
		getConnectionInfo(userId),
		getGaliciaConnection(userId)
	]);
	return {
		mpAccount: importAccountOf(mp),
		needsReconnect: mp?.needsReconnect ?? false,
		galiciaReady: !!galicia?.arsAccountId
	};
}
