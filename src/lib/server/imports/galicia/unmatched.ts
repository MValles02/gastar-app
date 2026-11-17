import { and, desc, eq, inArray, isNull, like, ne, sql } from 'drizzle-orm';
import { canAccessAccount, canAccessOwn } from '../../access';
import { db } from '../../db';
import { appTz } from '../../db/sql';
import { cardStatements, financialAccounts, mpImportItems } from '../../db/schema';
import { GALICIA_SOURCE, type Kind, type SourceId } from '../sources';
import { rejectImport, undoApproval } from '../store';
import { UNMATCHED_AFTER_STATEMENTS } from './matching';

// "No apareció en el resumen": a credit-card alert item with no statement line after enough statements
// closed. Nothing is removed automatically; the user discards it or keeps it.

/** The user's alert items still unmatched after UNMATCHED_AFTER_STATEMENTS statements of their network closed after them. */
const unmatched = (userId: string) =>
	and(
		canAccessOwn(userId, mpImportItems),
		inArray(mpImportItems.source, Object.values(GALICIA_SOURCE)),
		like(mpImportItems.externalKey, 'alert:%'),
		isNull(mpImportItems.aliasKey),
		isNull(mpImportItems.unmatchedKeptAt),
		ne(mpImportItems.status, 'rejected'),
		sql`(select count(*) from ${cardStatements} where ${cardStatements.userId} = ${mpImportItems.userId} and ${cardStatements.source} = ${mpImportItems.source} and ${cardStatements.closing} > (${mpImportItems.occurredAt} at time zone ${appTz})::date) >= ${UNMATCHED_AFTER_STATEMENTS}`
	);

export function listUnmatchedAlerts(userId: string) {
	return db
		.select({
			id: mpImportItems.id,
			source: sql<SourceId>`${mpImportItems.source}`,
			kind: sql<Kind>`${mpImportItems.kind}`,
			isCredit: mpImportItems.isCredit,
			amount: mpImportItems.amount,
			occurredAt: mpImportItems.occurredAt,
			counterpartyNickname: mpImportItems.counterpartyNickname,
			merchant: mpImportItems.merchant,
			rawDescription: mpImportItems.rawDescription,
			installment: mpImportItems.installment,
			currency: financialAccounts.currency
		})
		.from(mpImportItems)
		.innerJoin(financialAccounts, eq(financialAccounts.id, mpImportItems.accountId))
		.where(and(unmatched(userId), canAccessAccount(userId)))
		.orderBy(desc(mpImportItems.occurredAt));
}

/** "Dejar": the item stays and leaves the list. */
export async function keepUnmatched(userId: string, id: string): Promise<boolean> {
	const rows = await db
		.update(mpImportItems)
		.set({ unmatchedKeptAt: sql`now()` })
		.where(and(eq(mpImportItems.id, id), unmatched(userId)))
		.returning({ id: mpImportItems.id });
	return rows.length > 0;
}

/**
 * "Descartar": undoes the approval of the item (existing undo rules: 'changed' when its movement was
 * edited meanwhile, nothing written) and rejects it; a pending item is just rejected.
 */
export async function discardUnmatched(
	userId: string,
	id: string
): Promise<'discarded' | 'changed' | 'stale'> {
	const [item] = await db
		.select({ status: mpImportItems.status })
		.from(mpImportItems)
		.innerJoin(financialAccounts, eq(financialAccounts.id, mpImportItems.accountId))
		.where(and(eq(mpImportItems.id, id), unmatched(userId), canAccessAccount(userId)))
		.limit(1);
	if (!item) return 'stale';
	if (item.status === 'approved') {
		const undone = await undoApproval(userId, id);
		if (undone !== 'undone') return undone;
	}
	return (await rejectImport(userId, id)) === 'rejected' ? 'discarded' : 'stale';
}
