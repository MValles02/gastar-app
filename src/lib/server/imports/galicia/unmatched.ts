import { and, desc, eq, inArray, isNull, like, ne, sql } from 'drizzle-orm';
import { canAccessAccount, canAccessOwn } from '../../access';
import { db } from '../../db';
import { appTz } from '../../db/sql';
import { cardStatements, financialAccounts, importItems } from '../../db/schema';
import { ALERT_KEYS } from '../keys';
import { GALICIA_SOURCE, type Kind, type SourceId } from '#lib/imports.ts';

import { rejectImport, undoApproval } from '../store';
import { UNMATCHED_AFTER_STATEMENTS } from './matching';

// "No apareció en el resumen": a credit-card alert item with no statement line after enough statements
// closed. Nothing is removed automatically; the user discards it or keeps it.

/** The user's alert items still unmatched after UNMATCHED_AFTER_STATEMENTS statements of their network closed after them. */
const unmatched = (userId: string) =>
	and(
		canAccessOwn(userId, importItems),
		inArray(importItems.source, Object.values(GALICIA_SOURCE)),
		like(importItems.externalKey, ALERT_KEYS),
		isNull(importItems.aliasKey),
		isNull(importItems.unmatchedKeptAt),
		ne(importItems.status, 'rejected'),
		sql`(select count(*) from ${cardStatements} where ${cardStatements.userId} = ${importItems.userId} and ${cardStatements.source} = ${importItems.source} and ${cardStatements.closing} > (${importItems.occurredAt} at time zone ${appTz})::date) >= ${UNMATCHED_AFTER_STATEMENTS}`
	);

export function listUnmatchedAlerts(userId: string) {
	return db
		.select({
			id: importItems.id,
			source: sql<SourceId>`${importItems.source}`,
			kind: sql<Kind>`${importItems.kind}`,
			isCredit: importItems.isCredit,
			amount: importItems.amount,
			occurredAt: importItems.occurredAt,
			counterpartyNickname: importItems.counterpartyNickname,
			merchant: importItems.merchant,
			rawDescription: importItems.rawDescription,
			installment: importItems.installment,
			currency: financialAccounts.currency
		})
		.from(importItems)
		.innerJoin(financialAccounts, eq(financialAccounts.id, importItems.accountId))
		.where(and(unmatched(userId), canAccessAccount(userId)))
		.orderBy(desc(importItems.occurredAt));
}

/** "Dejar": the item stays and leaves the list. */
export async function keepUnmatched(userId: string, id: string): Promise<boolean> {
	const rows = await db
		.update(importItems)
		.set({ unmatchedKeptAt: sql`now()` })
		.where(and(eq(importItems.id, id), unmatched(userId)))
		.returning({ id: importItems.id });
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
		.select({ status: importItems.status })
		.from(importItems)
		.innerJoin(financialAccounts, eq(financialAccounts.id, importItems.accountId))
		.where(and(eq(importItems.id, id), unmatched(userId), canAccessAccount(userId)))
		.limit(1);
	if (!item) return 'stale';
	if (item.status === 'approved') {
		const undone = await undoApproval(userId, id);
		if (undone !== 'undone') return undone;
	}
	return (await rejectImport(userId, id)) === 'rejected' ? 'discarded' : 'stale';
}
