import { and, eq, type AnyColumn, type SQL } from 'drizzle-orm';
import { categories, financialAccounts, movements } from './db/schema';

/** The single ownership check for accounts (and, through them, movements). Accepts an alias. */
export function canAccessAccount(
	userId: string,
	account: { ownerId: AnyColumn } = financialAccounts
): SQL {
	return eq(account.ownerId, userId);
}

/** Insert-side counterpart of canAccessAccount: spread into `values()` to set the owner. */
export function ownedBy(userId: string) {
	return { ownerId: userId };
}

/** The single ownership check for categories. Accepts an alias. */
export function canAccessCategory(userId: string, cat: { userId: AnyColumn } = categories): SQL {
	return eq(cat.userId, userId);
}

/** Insert-side counterpart of canAccessCategory. */
export function categoryOwnedBy(userId: string) {
	return { userId };
}

/** Insert-side counterpart of canAccessAccount for movements: spread into `values()` to set the owner. */
export function movementOwnedBy(userId: string) {
	return { userId };
}

/** The single ownership check for movements: the movement and its origin account (inner-joined by the caller) must both be the user's. */
export function canAccessMovement(
	userId: string,
	origin: { ownerId: AnyColumn } = financialAccounts
): SQL {
	return and(eq(movements.userId, userId), canAccessAccount(userId, origin))!;
}
