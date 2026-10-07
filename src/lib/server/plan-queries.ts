import { and, eq, gte, isNotNull, lt } from 'drizzle-orm';
import { db } from './db';
import { categories, financialAccounts, movements, recurringMovements } from './db/schema';
import {
	canAccessAccount,
	canAccessCategory,
	canAccessMovement,
	canAccessRecurring,
	recurringOwnedBy
} from './access';
import type { Currency } from './dashboard';

type Range = { start: Date; end: Date };

export type RecurringRow = {
	type: 'income' | 'outcome';
	description: string;
	amount: number;
	accountId: string;
	categoryId: string;
	dayOfMonth: number;
};

/** The user's rules (archived ones included; see `isRecurringActive`), optionally for one currency or one id. */
export function listRecurring(userId: string, cur?: Currency, id?: string) {
	return db
		.select({
			id: recurringMovements.id,
			type: recurringMovements.type,
			description: recurringMovements.description,
			amount: recurringMovements.amount,
			dayOfMonth: recurringMovements.dayOfMonth,
			archivedAt: recurringMovements.archivedAt,
			accountId: recurringMovements.accountId,
			accountName: financialAccounts.name,
			accountArchivedAt: financialAccounts.archivedAt,
			currency: financialAccounts.currency,
			categoryId: recurringMovements.categoryId,
			categoryName: categories.name,
			categoryArchivedAt: categories.archivedAt
		})
		.from(recurringMovements)
		.innerJoin(
			financialAccounts,
			and(eq(recurringMovements.accountId, financialAccounts.id), canAccessAccount(userId))
		)
		.innerJoin(
			categories,
			and(eq(recurringMovements.categoryId, categories.id), canAccessCategory(userId))
		)
		.where(
			and(
				canAccessRecurring(userId),
				cur ? eq(financialAccounts.currency, cur) : undefined,
				id ? eq(recurringMovements.id, id) : undefined
			)
		)
		.orderBy(recurringMovements.dayOfMonth, recurringMovements.description);
}

/** Rules with a linked movement in the range. */
export function paidRecurring(userId: string, range: Range) {
	return db
		.selectDistinct({ recurringId: movements.recurringId })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(
				canAccessMovement(userId),
				isNotNull(movements.recurringId),
				gte(movements.occurredAt, range.start),
				lt(movements.occurredAt, range.end)
			)
		);
}

export function createRecurring(userId: string, row: RecurringRow) {
	return db
		.insert(recurringMovements)
		.values({ ...row, ...recurringOwnedBy(userId) })
		.returning({ id: recurringMovements.id });
}

export function updateRecurring(userId: string, id: string, row: RecurringRow) {
	return db
		.update(recurringMovements)
		.set({ ...row, updatedAt: new Date() })
		.where(and(eq(recurringMovements.id, id), canAccessRecurring(userId)))
		.returning({ id: recurringMovements.id });
}

export function setRecurringArchived(userId: string, id: string, archived: boolean) {
	return db
		.update(recurringMovements)
		.set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
		.where(and(eq(recurringMovements.id, id), canAccessRecurring(userId)))
		.returning({ id: recurringMovements.id });
}

export function deleteRecurring(userId: string, id: string) {
	return db
		.delete(recurringMovements)
		.where(and(eq(recurringMovements.id, id), canAccessRecurring(userId)))
		.returning({ id: recurringMovements.id });
}
