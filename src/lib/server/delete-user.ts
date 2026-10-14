import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import {
	categories,
	financialAccounts,
	movements,
	planCategoryLimits,
	recurringMovements,
	spendingPlans,
	user,
	verification
} from './db/schema';

/**
 * Hard-deletes a user and everything they own in one transaction, in FK-safe order:
 * movements (restrict FKs to accounts/categories) first, then the rest, then the user
 * (sessions and credential accounts cascade). Irreversible.
 */
export async function deleteUserAndData(userId: string): Promise<void> {
	await db.transaction(async (tx) => {
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
