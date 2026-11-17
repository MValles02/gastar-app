import { eq, inArray } from 'drizzle-orm';
import { allMovementsOf, canAccessAccount, canAccessOwn } from './access';
import { db } from './db';
import { revokeGmail } from './imports/gmail/oauth';
import {
	categories,
	financialAccounts,
	gmailConnections,
	galiciaConnections,
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
 * import rows and connections (Mercado Pago, Banco Galicia) and movements (restrict FKs to accounts/categories) first, then the rest, then the user
 * (sessions and credential accounts cascade). Irreversible.
 */
export async function deleteUserAndData(userId: string): Promise<void> {
	// Best effort and outside the transaction: a slow or failing Google must not block the deletion.
	await revokeGmail(userId);
	await db.transaction(async (tx) => {
		await tx.delete(mpConnections).where(canAccessOwn(userId, mpConnections));
		await tx.delete(galiciaConnections).where(canAccessOwn(userId, galiciaConnections));
		await tx.delete(gmailConnections).where(canAccessOwn(userId, gmailConnections));
		await tx.delete(mpImportItems).where(canAccessOwn(userId, mpImportItems));
		await tx.delete(mpImportRules).where(canAccessOwn(userId, mpImportRules));
		const ownAccounts = tx
			.select({ id: financialAccounts.id })
			.from(financialAccounts)
			.where(canAccessAccount(userId));
		await tx.delete(mpSyncState).where(inArray(mpSyncState.accountId, ownAccounts));
		await tx.delete(movements).where(allMovementsOf(userId));
		await tx.delete(recurringMovements).where(canAccessOwn(userId, recurringMovements));
		const plans = tx
			.select({ id: spendingPlans.id })
			.from(spendingPlans)
			.where(canAccessOwn(userId, spendingPlans));
		await tx.delete(planCategoryLimits).where(inArray(planCategoryLimits.planId, plans));
		await tx.delete(spendingPlans).where(canAccessOwn(userId, spendingPlans));
		await tx.delete(categories).where(canAccessOwn(userId, categories));
		await tx.delete(financialAccounts).where(canAccessAccount(userId));
		// Reset-password tokens store the user id in `value`.
		await tx.delete(verification).where(eq(verification.value, userId));
		await tx.delete(user).where(eq(user.id, userId));
	});
}
