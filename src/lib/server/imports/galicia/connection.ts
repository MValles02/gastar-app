import type { Currency } from '#lib/money.ts';
import { canAccessOwn, userOwned } from '../../access';
import { db } from '../../db';
import { galiciaConnections } from '../../db/schema';
import { isActiveAccountIn } from '../connections';

export type CardAccounts = { arsAccountId: string | null; usdAccountId: string | null };

/** The accounts a card's items land on: a credit card uses the Banco Galicia ones, any other its own. */
export const accountsFor = (
	card: CardAccounts & { type: string | null },
	galicia: CardAccounts | undefined
) => (card.type === 'credit' ? galicia : card);

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

/** Saves the pesos or dollar account (creating the connection). False unless it is the user's, active and of that currency. */
export async function setGaliciaAccount(
	userId: string,
	currency: Currency,
	accountId: string
): Promise<boolean> {
	if (!(await isActiveAccountIn(userId, currency, accountId))) return false;
	const set = { ARS: { arsAccountId: accountId }, USD: { usdAccountId: accountId } }[currency];
	await db
		.insert(galiciaConnections)
		.values({ ...userOwned(userId), ...set })
		.onConflictDoUpdate({ target: galiciaConnections.userId, set });
	return true;
}
