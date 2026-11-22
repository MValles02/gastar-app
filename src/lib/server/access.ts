import { and, eq, type AnyColumn, type SQL } from 'drizzle-orm';
import { financialAccounts, movements } from './db/schema';
import { dest } from './db/sql';

/** The single ownership check for accounts (and, through them, movements). Accepts an alias. */
export function canAccessAccount(
	userId: string,
	account: { ownerId: AnyColumn } = financialAccounts
): SQL {
	return eq(account.ownerId, userId);
}

/** Join condition for a movement's destination account (the `dest` alias), only when the user owns it. */
export function ownedDestination(userId: string): SQL {
	return and(eq(movements.destinationAccountId, dest.id), canAccessAccount(userId, dest))!;
}

/** Spread into `values()` to set an account's owner. */
export function ownedBy(userId: string) {
	return { ownerId: userId };
}

/**
 * The single ownership check for movements: the movement and its origin account must both be the user's.
 * The caller must inner-join the origin account (`financialAccounts`, or the alias passed as `origin`)
 * on `movements.accountId`; without that join the query errors (missing FROM entry), it never
 * silently widens. `categorizedMovements` is the join-enforcing base for category queries.
 */
export function canAccessMovement(
	userId: string,
	origin: { ownerId: AnyColumn } = financialAccounts
): SQL {
	return and(eq(movements.userId, userId), canAccessAccount(userId, origin))!;
}

/**
 * The single path for bulk operations over every movement a user owns (account deletion).
 * Per-movement reads and writes use canAccessMovement.
 */
export function allMovementsOf(userId: string): SQL {
	return eq(movements.userId, userId);
}

/**
 * The single ownership check for every other user-owned table (categories, recurring rules, plans,
 * Mercado Pago and Banco Galicia rows). Category limits are reached only by joining their plan.
 */
export function canAccessOwn(userId: string, table: { userId: AnyColumn }): SQL {
	return eq(table.userId, userId);
}

/** Spread into `values()` to set the owner of a `canAccessOwn` table. */
export function userOwned(userId: string) {
	return { userId };
}
