import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
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
import type { Currency } from './dashboard';
import { TZ } from './month';
import type { MovementRow } from './movements';

type Range = { start: Date; end: Date };

// TZ is inlined as a literal: a bound parameter makes SELECT and GROUP BY different expressions.
const tzLiteral = sql.raw(`'${TZ}'`);
const localMonth = sql<string>`to_char(${movements.occurredAt} at time zone ${tzLiteral}, 'YYYY-MM')`;

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

/**
 * Unlinked incomes/outcomes that happened in each of the 3 months of `range` with the same
 * description, account and category: likely recurring, suggested when setting up a plan.
 */
export function recurringCandidates(userId: string, cur: Currency, range: Range) {
	return db
		.select({
			type: movements.type,
			description: sql<string>`min(${movements.description})`,
			amount: sql<number>`round(avg(${movements.amount}))`.mapWith(Number),
			dayOfMonth:
				sql<number>`extract(day from max(${movements.occurredAt}) at time zone ${tzLiteral})`.mapWith(
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
				eq(financialAccounts.currency, cur),
				isNull(financialAccounts.archivedAt),
				isNull(movements.recurringId),
				or(eq(movements.type, 'income'), eq(movements.type, 'outcome')),
				gte(movements.occurredAt, range.start),
				lt(movements.occurredAt, range.end)
			)
		)
		.groupBy(
			sql`lower(${movements.description})`,
			movements.type,
			movements.accountId,
			movements.categoryId
		)
		.having(sql`count(distinct ${localMonth}) >= 3`);
}

// --- Spending plans ---

export function getPlan(userId: string, cur: Currency) {
	return db
		.select({
			id: spendingPlans.id,
			currency: spendingPlans.currency,
			extraIncome: spendingPlans.extraIncome,
			savings: spendingPlans.savings,
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
				gte(movements.occurredAt, range.start),
				lt(movements.occurredAt, range.end)
			)
		)
		.groupBy(movements.categoryId, movements.recurringId);
}

/** Thrown inside the `savePlan` transaction to roll everything back; `step` is the wizard step to show. */
export class PlanRejected extends Error {
	constructor(
		readonly step: number,
		message: string
	) {
		super(message);
	}
}

export type PlanSave = {
	extraIncome: number;
	savings: number;
	month: string | null;
	limits: { categoryId: string; amount: number }[];
	newRules: RecurringRow[];
	archiveIds: string[];
};

/**
 * Writes the user's plan for `cur`, its limits and any rules it creates or archives in ONE transaction.
 * Every account and category id is checked against the user inside it; a bad one throws `PlanRejected`
 * and nothing is written.
 */
export function savePlan(userId: string, cur: Currency, v: PlanSave) {
	return db.transaction(async (tx) => {
		if (v.newRules.length > 0) {
			const accountIds = [...new Set(v.newRules.map((r) => r.accountId))];
			const categoryIds = [...new Set(v.newRules.map((r) => r.categoryId))];
			const [accountRows, categoryRows] = await Promise.all([
				tx
					.select({ id: financialAccounts.id })
					.from(financialAccounts)
					.where(
						and(
							inArray(financialAccounts.id, accountIds),
							canAccessAccount(userId),
							eq(financialAccounts.currency, cur),
							isNull(financialAccounts.archivedAt)
						)
					),
				tx
					.select({ id: categories.id })
					.from(categories)
					.where(
						and(
							inArray(categories.id, categoryIds),
							canAccessCategory(userId),
							isNull(categories.archivedAt)
						)
					)
			]);
			if (accountRows.length !== accountIds.length || categoryRows.length !== categoryIds.length)
				throw new PlanRejected(1, 'Elegí una cuenta y una categoría válidas para cada fila.');
			await tx
				.insert(recurringMovements)
				.values(v.newRules.map((r) => ({ ...r, ...recurringOwnedBy(userId) })));
		}

		if (v.archiveIds.length > 0)
			await tx
				.update(recurringMovements)
				.set({ archivedAt: new Date(), updatedAt: new Date() })
				.where(and(inArray(recurringMovements.id, v.archiveIds), canAccessRecurring(userId)));

		const fields = { extraIncome: v.extraIncome, savings: v.savings, month: v.month };
		const [plan] = await tx
			.insert(spendingPlans)
			.values({ ...fields, currency: cur, ...planOwnedBy(userId) })
			.onConflictDoUpdate({
				target: [spendingPlans.userId, spendingPlans.currency],
				set: { ...fields, updatedAt: new Date() }
			})
			.returning({ id: spendingPlans.id });

		await tx.delete(planCategoryLimits).where(eq(planCategoryLimits.planId, plan.id));
		if (v.limits.length > 0) {
			const ids = v.limits.map((l) => l.categoryId);
			const owned = await tx
				.select({ id: categories.id })
				.from(categories)
				.where(
					and(inArray(categories.id, ids), canAccessCategory(userId), isNull(categories.archivedAt))
				);
			if (owned.length !== ids.length)
				throw new PlanRejected(4, 'Elegí una categoría válida para cada límite.');
			await tx.insert(planCategoryLimits).values(v.limits.map((l) => ({ ...l, planId: plan.id })));
		}
		return plan.id;
	});
}

export function deletePlan(userId: string, cur: Currency) {
	return db
		.delete(spendingPlans)
		.where(and(canAccessPlan(userId), eq(spendingPlans.currency, cur)))
		.returning({ id: spendingPlans.id });
}
