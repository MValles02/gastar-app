import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import {
	categories,
	financialAccounts,
	movements,
	mpConnections,
	mpImportItems,
	mpImportRules,
	mpSyncState,
	planCategoryLimits,
	recurringMovements,
	spendingPlans,
	user,
	verification
} from './db/schema';

/**
 * Hard-deletes a user and everything they own in one transaction, in FK-safe order:
 * Mercado Pago import rows and movements (restrict FKs to accounts/categories) first, then the rest, then the user
 * (sessions and credential accounts cascade). Irreversible.
 */
export async function deleteUserAndData(userId: string): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.delete(mpConnections).where(eq(mpConnections.userId, userId));
		await tx.delete(mpImportItems).where(eq(mpImportItems.userId, userId));
		await tx.delete(mpImportRules).where(eq(mpImportRules.userId, userId));
		const ownAccounts = tx
			.select({ id: financialAccounts.id })
			.from(financialAccounts)
			.where(eq(financialAccounts.ownerId, userId));
		await tx.delete(mpSyncState).where(inArray(mpSyncState.accountId, ownAccounts));
		await tx.delete(movements).where(eq(movements.userId, userId));
		await tx.delete(recurringMovements).where(eq(recurringMovements.userId, userId));
		const plans = tx
			.select({ id: spendingPlans.id })
			.from(spendingPlans)
			.where(eq(spendingPlans.userId, userId));
		await tx.delete(planCategoryLimits).where(inArray(planCategoryLimits.planId, plans));
		await tx.delete(spendingPlans).where(eq(spendingPlans.userId, userId));
		await tx.delete(categories).where(eq(categories.userId, userId));
		await tx.delete(financialAccounts).where(eq(financialAccounts.ownerId, userId));
		// Reset-password tokens store the user id in `value`.
		await tx.delete(verification).where(eq(verification.value, userId));
		await tx.delete(user).where(eq(user.id, userId));
	});
}
