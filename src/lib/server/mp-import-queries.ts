import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { financialAccounts, mpImportItems, mpImportRules, mpSyncState } from './db/schema';
import { canAccessAccount, canAccessImport, canAccessImportRule } from './access';
import { mpImportAccountId } from './mp-sync';

const pending = (userId: string) =>
	and(canAccessImport(userId), eq(mpImportItems.status, 'pending'));

/** The configured import account when it is the user's, else null. */
export async function getImportAccount(userId: string) {
	const id = mpImportAccountId();
	if (!id) return null;
	const [row] = await db
		.select({ id: financialAccounts.id, name: financialAccounts.name })
		.from(financialAccounts)
		.where(and(eq(financialAccounts.id, id), canAccessAccount(userId)))
		.limit(1);
	return row ?? null;
}

export function listPendingImports(userId: string) {
	return db
		.select({
			id: mpImportItems.id,
			kind: mpImportItems.kind,
			isCredit: mpImportItems.isCredit,
			amount: mpImportItems.amount,
			occurredAt: mpImportItems.occurredAt,
			counterpartyNickname: mpImportItems.counterpartyNickname,
			merchant: mpImportItems.merchant,
			rawDescription: mpImportItems.rawDescription
		})
		.from(mpImportItems)
		.where(pending(userId))
		.orderBy(desc(mpImportItems.occurredAt), desc(mpImportItems.createdAt));
}

export async function pendingImportCount(userId: string): Promise<number> {
	const [row] = await db.select({ n: count() }).from(mpImportItems).where(pending(userId));
	return row.n;
}

export async function getSyncState(userId: string, accountId: string) {
	const [row] = await db
		.select({
			syncedUntil: mpSyncState.syncedUntil,
			runningSince: mpSyncState.runningSince,
			lastRunAt: mpSyncState.lastRunAt,
			lastError: mpSyncState.lastError
		})
		.from(mpSyncState)
		.innerJoin(financialAccounts, eq(mpSyncState.accountId, financialAccounts.id))
		.where(and(eq(mpSyncState.accountId, accountId), canAccessAccount(userId)))
		.limit(1);
	return row ?? null;
}

/** Dev reset: the user's items and rules, plus the sync state of `accountId` if it is theirs. */
export function deleteImportData(userId: string, accountId: string) {
	return db.transaction(async (tx) => {
		await tx.delete(mpImportItems).where(canAccessImport(userId));
		await tx.delete(mpImportRules).where(canAccessImportRule(userId));
		await tx.delete(mpSyncState).where(
			and(
				eq(mpSyncState.accountId, accountId),
				inArray(
					mpSyncState.accountId,
					tx
						.select({ id: financialAccounts.id })
						.from(financialAccounts)
						.where(and(eq(financialAccounts.id, accountId), canAccessAccount(userId)))
				)
			)
		);
	});
}
