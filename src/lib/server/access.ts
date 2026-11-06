import { and, eq, type AnyColumn, type SQL } from 'drizzle-orm';
import {
	categories,
	financialAccounts,
	movements,
	mpConnections,
	mpImportItems,
	mpImportRules,
	recurringMovements,
	spendingPlans
} from './db/schema';

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

/**
 * The single path for bulk operations over every movement a user owns (account deletion).
 * Per-movement reads and writes use canAccessMovement.
 */
export function allMovementsOf(userId: string): SQL {
	return eq(movements.userId, userId);
}

/** The single ownership check for recurring rules. Accepts an alias. */
export function canAccessRecurring(
	userId: string,
	r: { userId: AnyColumn } = recurringMovements
): SQL {
	return eq(r.userId, userId);
}

/** Insert-side counterpart of canAccessRecurring. */
export function recurringOwnedBy(userId: string) {
	return { userId };
}

/** The single ownership check for Mercado Pago import items. Accepts an alias. */
export function canAccessImport(userId: string, i: { userId: AnyColumn } = mpImportItems): SQL {
	return eq(i.userId, userId);
}

/** Insert-side counterpart of canAccessImport. */
export function importOwnedBy(userId: string) {
	return { userId };
}

/** The single ownership check for Mercado Pago import rules. Accepts an alias. */
export function canAccessImportRule(userId: string, r: { userId: AnyColumn } = mpImportRules): SQL {
	return eq(r.userId, userId);
}

/** Insert-side counterpart of canAccessImportRule. */
export function importRuleOwnedBy(userId: string) {
	return { userId };
}

/** The single ownership check for Mercado Pago connections. Accepts an alias. */
export function canAccessMpConnection(
	userId: string,
	c: { userId: AnyColumn } = mpConnections
): SQL {
	return eq(c.userId, userId);
}

/** Insert-side counterpart of canAccessMpConnection. */
export function mpConnectionOwnedBy(userId: string) {
	return { userId };
}

/** The single ownership check for spending plans. Category limits are reached only by joining their plan. */
export function canAccessPlan(userId: string, p: { userId: AnyColumn } = spendingPlans): SQL {
	return eq(p.userId, userId);
}

/** Insert-side counterpart of canAccessPlan. */
export function planOwnedBy(userId: string) {
	return { userId };
}
