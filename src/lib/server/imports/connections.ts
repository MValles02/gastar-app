import { and, eq, isNull } from 'drizzle-orm';
import type { Currency } from '#lib/money.ts';
import { canAccessAccount, canAccessOwn } from '../access';
import { db } from '../db';
import { financialAccounts, galiciaConnections, mpConnections } from '../db/schema';

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
		.where(
			and(
				canAccessAccount(userId),
				eq(financialAccounts.currency, currency),
				isNull(financialAccounts.archivedAt)
			)
		)
		.orderBy(financialAccounts.name);
}

/** True when `accountId` is one of the user's active accounts of that currency. */
export const isActiveAccountIn = async (userId: string, currency: Currency, accountId: string) =>
	(await activeAccountsIn(userId, currency)).some((a) => a.id === accountId);

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

export async function getGaliciaConnection(userId: string) {
	const [row] = await db
		.select({
			arsAccountId: galiciaConnections.arsAccountId,
			usdAccountId: galiciaConnections.usdAccountId
		})
		.from(galiciaConnections)
		.where(canAccessOwn(userId, galiciaConnections))
		.limit(1);
	return row;
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
