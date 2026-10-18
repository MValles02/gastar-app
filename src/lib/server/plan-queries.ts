import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import {
	categories,
	financialAccounts,
	movements,
	planCategoryLimits,
	recurringMovements,
	spendingPlans
} from './db/schema';
import {
	canAccessAccount,
	canAccessCategory,
	canAccessMovement,
	canAccessPlan,
	canAccessRecurring,
	movementOwnedBy,
	planOwnedBy,
	recurringOwnedBy
} from './access';
import type { Currency } from '$lib/money';
import type { MovementRow } from './movements';
import { isRecurringActive } from './plan';

type Range = { start: Date; end: Date };

const occurredIn = (range: Range) =>
	and(gte(movements.occurredAt, range.start), lt(movements.occurredAt, range.end));

/** The rule `id`, only if the user may access it. */
const ownRule = (userId: string, id: string) =>
	and(eq(recurringMovements.id, id), canAccessRecurring(userId));

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

const ruleAccount = alias(financialAccounts, 'rule_account');

/**
 * Rules with a linked movement in the range. A link survives edits, so it only counts while the
 * movement still matches the rule: same type, and an account in the rule account's currency.
 */
export function paidRecurring(userId: string, range: Range) {
	return db
		.selectDistinct({ recurringId: movements.recurringId })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(recurringMovements, eq(movements.recurringId, recurringMovements.id))
		.innerJoin(ruleAccount, eq(recurringMovements.accountId, ruleAccount.id))
		.where(
			and(
				canAccessMovement(userId),
				occurredIn(range),
				eq(movements.type, recurringMovements.type),
				eq(financialAccounts.currency, ruleAccount.currency)
			)
		);
}

export function createRecurring(userId: string, row: RecurringRow) {
	return db
		.insert(recurringMovements)
		.values({ ...row, ...recurringOwnedBy(userId) })
		.returning({ id: recurringMovements.id });
}

/**
 * "Repetir cada mes": the rule and the movement linked to it, in ONE transaction. The caller has
 * already checked the account and category against the user; any failure writes nothing.
 */
export function createMovementWithRule(userId: string, row: MovementRow, ruleRow: RecurringRow) {
	return db.transaction(async (tx) => {
		const [rule] = await tx
			.insert(recurringMovements)
			.values({ ...ruleRow, ...recurringOwnedBy(userId) })
			.returning({ id: recurringMovements.id });
		const [movement] = await tx
			.insert(movements)
			.values({ ...row, ...movementOwnedBy(userId), recurringId: rule.id })
			.returning({ id: movements.id });
		return { ruleId: rule.id, movementId: movement.id };
	});
}

export function updateRecurring(userId: string, id: string, row: RecurringRow) {
	return db
		.update(recurringMovements)
		.set({ ...row, updatedAt: new Date() })
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

// --- Spending plans ---

export function getPlan(userId: string, cur: Currency) {
	return db
		.select({
			id: spendingPlans.id,
			currency: spendingPlans.currency,
			savings: spendingPlans.savings,
			savingsPercent: spendingPlans.savingsPercent,
			month: spendingPlans.month
		})
		.from(spendingPlans)
		.where(and(canAccessPlan(userId), eq(spendingPlans.currency, cur)))
		.limit(1);
}

export function planLimits(userId: string, planId: string) {
	return db
		.select({
			categoryId: planCategoryLimits.categoryId,
			name: categories.name,
			color: categories.color,
			icon: categories.icon,
			amount: planCategoryLimits.amount
		})
		.from(planCategoryLimits)
		.innerJoin(
			spendingPlans,
			and(eq(planCategoryLimits.planId, spendingPlans.id), canAccessPlan(userId))
		)
		.innerJoin(
			categories,
			and(eq(planCategoryLimits.categoryId, categories.id), canAccessCategory(userId))
		)
		.where(eq(planCategoryLimits.planId, planId))
		.orderBy(desc(planCategoryLimits.amount), categories.name);
}

/**
 * Outcomes (never transfers) on accounts of `cur` in the range, archived accounts included, summed per
 * category and linked rule; `planSpent` decides which count.
 */
export function monthOutcomes(userId: string, cur: Currency, range: Range) {
	return db
		.select({
			categoryId: movements.categoryId,
			recurringId: movements.recurringId,
			amount: sql<number>`coalesce(sum(${movements.amount}), 0)`.mapWith(Number)
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(
				canAccessMovement(userId),
				eq(financialAccounts.currency, cur),
				eq(movements.type, 'outcome'),
				occurredIn(range)
			)
		)
		.groupBy(movements.categoryId, movements.recurringId);
}

/** Thrown inside `upsertLimits` to roll it back; the message is shown to the user. */
export class PlanRejected extends Error {}

export function deletePlan(userId: string, cur: Currency) {
	return db
		.delete(spendingPlans)
		.where(and(canAccessPlan(userId), eq(spendingPlans.currency, cur)))
		.returning({ id: spendingPlans.id });
}

/** Sum of the user's active recurring incomes in `cur` (the same definition `planView` uses). */
export async function planIncome(userId: string, cur: Currency) {
	const rules = await listRecurring(userId, cur);
	return rules
		.filter((r) => r.type === 'income' && isRecurringActive(r))
		.reduce((a, r) => a + r.amount, 0);
}

export type PlanSavings = { savings: number; savingsPercent: number | null; month: string | null };

/** Creates the user's plan for `cur`, or overwrites its savings and month when one exists. */
export function upsertPlan(userId: string, cur: Currency, v: PlanSavings) {
	return db
		.insert(spendingPlans)
		.values({ ...v, currency: cur, ...planOwnedBy(userId) })
		.onConflictDoUpdate({
			target: [spendingPlans.userId, spendingPlans.currency],
			set: { ...v, updatedAt: new Date() }
		})
		.returning({ id: spendingPlans.id });
}

/** Patches the user's existing plan for `cur`. */
export function updatePlan(userId: string, cur: Currency, patch: Partial<PlanSavings>) {
	return db
		.update(spendingPlans)
		.set({ ...patch, updatedAt: new Date() })
		.where(and(canAccessPlan(userId), eq(spendingPlans.currency, cur)))
		.returning({ id: spendingPlans.id });
}

/** Sets the limits of the user's plan `planId` (insert or overwrite per category), in one transaction. */
export function upsertLimits(
	userId: string,
	planId: string,
	limits: { categoryId: string; amount: number }[]
) {
	return db.transaction(async (tx) => {
		const [plan] = await tx
			.select({ id: spendingPlans.id })
			.from(spendingPlans)
			.where(and(eq(spendingPlans.id, planId), canAccessPlan(userId)));
		if (!plan) throw new PlanRejected('Plan no encontrado.');
		const ids = limits.map((l) => l.categoryId);
		const owned = await tx
			.select({ id: categories.id })
			.from(categories)
			.where(and(inArray(categories.id, ids), canAccessCategory(userId)));
		if (owned.length !== new Set(ids).size) throw new PlanRejected('Elegí una categoría válida.');
		for (const l of limits)
			await tx
				.insert(planCategoryLimits)
				.values({ ...l, planId })
				.onConflictDoUpdate({
					target: [planCategoryLimits.planId, planCategoryLimits.categoryId],
					set: { amount: l.amount }
				});
	});
}

/** Removes one category limit from the user's plan `planId`. */
export async function deleteLimit(userId: string, planId: string, categoryId: string) {
	const plans = db
		.select({ id: spendingPlans.id })
		.from(spendingPlans)
		.where(and(eq(spendingPlans.id, planId), canAccessPlan(userId)));
	await db
		.delete(planCategoryLimits)
		.where(
			and(eq(planCategoryLimits.categoryId, categoryId), inArray(planCategoryLimits.planId, plans))
		);
}
