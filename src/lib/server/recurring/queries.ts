import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Currency } from '#lib/money.ts';
import { db, type DbExecutor } from '../db';
import { categories, financialAccounts, movements, recurringMovements } from '../db/schema';
import { appTz, inRange, localMonth, type Range } from '../db/sql';
import {
	canAccessAccount,
	canAccessMovement,
	canAccessOwn,
	movementOwnedBy,
	userOwned
} from '../access';
import { HISTORY_MONTHS } from '../month';
import type { MovementRow } from '../movements/form';

export const ownRule = (userId: string, id: string) =>
	and(eq(recurringMovements.id, id), canAccessOwn(userId, recurringMovements));

export type RecurringInput = {
	type: 'income' | 'outcome';
	description: string;
	amount: number;
	accountId: string;
	categoryId: string;
	dayOfMonth: number;
};

function recurringRows(userId: string, where: SQL | undefined) {
	return db
		.select({
			id: recurringMovements.id,
			type: recurringMovements.type,
			description: recurringMovements.description,
			amount: recurringMovements.amount,
			dayOfMonth: recurringMovements.dayOfMonth,
			previousAmount: recurringMovements.previousAmount,
			archivedAt: recurringMovements.archivedAt,
			accountId: recurringMovements.accountId,
			accountName: financialAccounts.name,
			accountArchivedAt: financialAccounts.archivedAt,
			currency: financialAccounts.currency,
			categoryId: recurringMovements.categoryId,
			categoryName: categories.name,
			categoryIcon: categories.icon,
			categoryColor: categories.color,
			categoryArchivedAt: categories.archivedAt
		})
		.from(recurringMovements)
		.innerJoin(
			financialAccounts,
			and(eq(recurringMovements.accountId, financialAccounts.id), canAccessAccount(userId))
		)
		.innerJoin(
			categories,
			and(eq(recurringMovements.categoryId, categories.id), canAccessOwn(userId, categories))
		)
		.where(and(canAccessOwn(userId, recurringMovements), where))
		.orderBy(recurringMovements.dayOfMonth, recurringMovements.description);
}

/** The user's rules (archived ones included; see `isRecurringActive`), optionally for one currency. */
export function listRecurring(userId: string, cur?: Currency) {
	return recurringRows(userId, cur ? eq(financialAccounts.currency, cur) : undefined);
}

/** Returns an array of 0 or 1 rows, like getAccount/getCategory. */
export function getRecurring(userId: string, id: string) {
	return recurringRows(userId, eq(recurringMovements.id, id));
}

export type RecurringRule = Awaited<ReturnType<typeof listRecurring>>[number];

const ruleAccount = alias(financialAccounts, 'rule_account');

/**
 * Rules with a linked movement in the range. A link survives edits, so it only counts while the
 * movement still matches the rule: same type, and an account in the rule account's currency.
 */
export function paidRecurring(userId: string, range: Range, executor: DbExecutor = db) {
	return executor
		.selectDistinct({ recurringId: movements.recurringId })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(recurringMovements, eq(movements.recurringId, recurringMovements.id))
		.innerJoin(ruleAccount, eq(recurringMovements.accountId, ruleAccount.id))
		.where(
			and(
				canAccessMovement(userId),
				inRange(range),
				eq(movements.type, recurringMovements.type),
				eq(financialAccounts.currency, ruleAccount.currency)
			)
		);
}

export function createRecurring(userId: string, row: RecurringInput) {
	return db
		.insert(recurringMovements)
		.values({ ...row, ...userOwned(userId) })
		.returning({ id: recurringMovements.id });
}

/**
 * "Repetir cada mes": the rule and the movement linked to it, in ONE transaction. The caller has
 * already checked the account and category against the user; any failure writes nothing.
 */
export function createMovementWithRule(userId: string, row: MovementRow, ruleRow: RecurringInput) {
	return db.transaction(async (tx) => {
		const [rule] = await tx
			.insert(recurringMovements)
			.values({ ...ruleRow, ...userOwned(userId) })
			.returning({ id: recurringMovements.id });
		const [movement] = await tx
			.insert(movements)
			.values({ ...row, ...movementOwnedBy(userId), recurringId: rule.id })
			.returning({ id: movements.id });
		return { ruleId: rule.id, movementId: movement.id };
	});
}

export function updateRecurring(userId: string, id: string, row: RecurringInput) {
	return db
		.update(recurringMovements)
		.set({
			...row,
			// A manual amount change clears "Antes $X" (it only describes a change that came from a linked charge).
			previousAmount: sql`case when ${recurringMovements.amount} = ${row.amount} then ${recurringMovements.previousAmount} else null end`,
			updatedAt: new Date()
		})
		.where(ownRule(userId, id))
		.returning({ id: recurringMovements.id });
}

export function setRecurringArchived(userId: string, id: string, archived: boolean) {
	return db
		.update(recurringMovements)
		.set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
		.where(ownRule(userId, id))
		.returning({ id: recurringMovements.id });
}

export function deleteRecurring(userId: string, id: string) {
	return db
		.delete(recurringMovements)
		.where(ownRule(userId, id))
		.returning({ id: recurringMovements.id });
}

/**
 * Unlinked outcomes that happened in each of the `HISTORY_MONTHS` months of `range` with the same
 * description, account and category: likely recurring. `id` is the group's most recent movement.
 */
export function recurringCandidates(userId: string, range: Range) {
	return db
		.select({
			currency: financialAccounts.currency,
			id: sql<string>`(array_agg(${movements.id} order by ${movements.occurredAt} desc))[1]`,
			description: sql<string>`min(trim(${movements.description}))`,
			amount:
				sql<number>`round(sum(${movements.amount})::numeric / count(distinct ${localMonth}))`.mapWith(
					Number
				),
			dayOfMonth:
				sql<number>`extract(day from max(${movements.occurredAt}) at time zone ${appTz})`.mapWith(
					Number
				),
			accountId: movements.accountId,
			categoryId: movements.categoryId
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(
				canAccessMovement(userId),
				isNull(financialAccounts.archivedAt),
				isNull(movements.recurringId),
				eq(movements.type, 'outcome'),
				inRange(range)
			)
		)
		.groupBy(
			sql`lower(trim(${movements.description}))`,
			movements.accountId,
			movements.categoryId,
			financialAccounts.currency
		)
		.having(sql`count(distinct ${localMonth}) >= ${HISTORY_MONTHS}`);
}
