import { eq, type AnyColumn, type SQL } from 'drizzle-orm';
import { financialAccounts } from './db/schema';

/** The single ownership check for accounts (and, through them, movements). Accepts an alias. */
export function canAccessAccount(
	userId: string,
	account: { ownerId: AnyColumn } = financialAccounts
): SQL {
	return eq(account.ownerId, userId);
}
