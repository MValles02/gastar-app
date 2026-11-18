import type { Currency } from '#lib/money.ts';
import { canAccessOwn } from '../../access';
import { db } from '../../db';
import { mpConnections } from '../../db/schema';
import { isActiveAccountIn } from '../connections';

/** Mercado Pago accounts are in pesos: the receiving account must be too. */
export const MP_CURRENCY = 'ARS' satisfies Currency;

/** Saves the receiving account. False when the account is not the user's, active and ARS, or there is no connection. */
export async function setReceivingAccount(userId: string, accountId: string): Promise<boolean> {
	if (!(await isActiveAccountIn(userId, MP_CURRENCY, accountId))) return false;
	const rows = await db
		.update(mpConnections)
		.set({ accountId })
		.where(canAccessOwn(userId, mpConnections))
		.returning({ userId: mpConnections.userId });
	return rows.length > 0;
}
