import { and, desc, eq, inArray, isNotNull, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '../db';
import {
	categories,
	financialAccounts,
	movements,
	planCategoryLimits,
	spendingPlans
} from '../db/schema';
import { exists, inRange, type Range } from '../db/sql';
import { canAccessMovement, canAccessOwn, userOwned } from '../access';
import type { Currency } from '#lib/money.ts';
import { PLAN_CURRENCY, type PlanSavings } from '#lib/plan.ts';
import { localDay } from '../month';

/** Whether the user has a spending plan (first-run checklist); legacy USD rows do not count. */
export function hasAnyPlan(userId: string) {
	return exists(
		db
			.select({ id: spendingPlans.id })
			.from(spendingPlans)
			.where(and(canAccessOwn(userId, spendingPlans), eq(spendingPlans.currency, PLAN_CURRENCY)))
	);
}

/** The plan is the user's `PLAN_CURRENCY` row; legacy USD rows are never read. */
export function getPlan(userId: string) {
	return db
		.select({
			id: spendingPlans.id,
			currency: spendingPlans.currency,
			savings: spendingPlans.savings,
			savingsPercent: spendingPlans.savingsPercent,
			month: spendingPlans.month,
			exchangeRate: spendingPlans.exchangeRate
		})
		.from(spendingPlans)
		.where(and(canAccessOwn(userId, spendingPlans), eq(spendingPlans.currency, PLAN_CURRENCY)))
		.limit(1);
}

export function currentPlanLimits(userId: string) {
	return limitRows(userId, eq(spendingPlans.currency, PLAN_CURRENCY));
}

export async function latestTransferRate(userId: string) {
	const [row] = await db
		.select({ rate: movements.exchangeRate, occurredAt: movements.occurredAt })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(
				canAccessMovement(userId),
				eq(movements.type, 'transfer'),
				isNotNull(movements.exchangeRate),
				lte(movements.occurredAt, sql`now()`)
			)
		)
		.orderBy(desc(movements.occurredAt), desc(movements.createdAt))
		.limit(1);
	return row ? { rate: row.rate!, occurredAt: row.occurredAt } : null;
}

export async function planRate(userId: string) {
	const [[plan], transfer] = await Promise.all([getPlan(userId), latestTransferRate(userId)]);
	if (plan?.exchangeRate) return { value: plan.exchangeRate, manual: true, day: null };
	return {
		value: transfer?.rate ?? null,
		manual: false,
		day: transfer ? localDay(transfer.occurredAt) : null
	};
}

export function planLimits(userId: string, planId: string) {
	return limitRows(userId, eq(planCategoryLimits.planId, planId));
}

function limitRows(userId: string, where: SQL | undefined) {
	return db
		.select({
			categoryId: planCategoryLimits.categoryId,
			name: categories.name,
			color: categories.color,
			icon: categories.icon,
			amount: planCategoryLimits.amount,
			currency: planCategoryLimits.currency
		})
		.from(planCategoryLimits)
		.innerJoin(
			spendingPlans,
			and(eq(planCategoryLimits.planId, spendingPlans.id), canAccessOwn(userId, spendingPlans))
		)
		.innerJoin(
			categories,
			and(eq(planCategoryLimits.categoryId, categories.id), canAccessOwn(userId, categories))
		)
		.where(where)
		.orderBy(desc(planCategoryLimits.amount), categories.name);
}

/**
 * Outcomes (never transfers) in the range, archived accounts included, summed per account currency,
 * category and linked rule; `planSpent` decides which count.
 */
export function monthOutcomes(userId: string, range: Range) {
	return db
		.select({
			currency: financialAccounts.currency,
			categoryId: movements.categoryId,
			recurringId: movements.recurringId,
			amount: sql<number>`coalesce(sum(${movements.amount}), 0)`.mapWith(Number)
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(and(canAccessMovement(userId), eq(movements.type, 'outcome'), inRange(range)))
		.groupBy(financialAccounts.currency, movements.categoryId, movements.recurringId);
}

export class PlanRejected extends Error {}

export function deletePlan(userId: string) {
	return db
		.delete(spendingPlans)
		.where(and(canAccessOwn(userId, spendingPlans), eq(spendingPlans.currency, PLAN_CURRENCY)))
		.returning({ id: spendingPlans.id });
}

type PlanMonth = { month: string | null };

export function upsertPlan(userId: string, v: PlanSavings & PlanMonth) {
	return db
		.insert(spendingPlans)
		.values({ ...v, currency: PLAN_CURRENCY, ...userOwned(userId) })
		.onConflictDoUpdate({
			target: [spendingPlans.userId, spendingPlans.currency],
			set: { ...v, updatedAt: new Date() }
		})
		.returning({ id: spendingPlans.id });
}

export function updatePlan(
	userId: string,
	patch: Partial<PlanSavings & PlanMonth & { exchangeRate: number | null }>
) {
	return db
		.update(spendingPlans)
		.set({ ...patch, updatedAt: new Date() })
		.where(and(canAccessOwn(userId, spendingPlans), eq(spendingPlans.currency, PLAN_CURRENCY)))
		.returning({ id: spendingPlans.id });
}

export function upsertLimits(
	userId: string,
	planId: string,
	limits: { categoryId: string; amount: number; currency: Currency }[]
) {
	return db.transaction(async (tx) => {
		const [plan] = await tx
			.select({ id: spendingPlans.id })
			.from(spendingPlans)
			.where(and(eq(spendingPlans.id, planId), canAccessOwn(userId, spendingPlans)));
		if (!plan) throw new PlanRejected('Plan no encontrado.');
		const ids = limits.map((l) => l.categoryId);
		const owned = await tx
			.select({ id: categories.id })
			.from(categories)
			.where(and(inArray(categories.id, ids), canAccessOwn(userId, categories)));
		if (owned.length !== new Set(ids).size) throw new PlanRejected('Elegí una categoría válida.');
		for (const l of limits)
			await tx
				.insert(planCategoryLimits)
				.values({ ...l, planId })
				.onConflictDoUpdate({
					target: [planCategoryLimits.planId, planCategoryLimits.categoryId],
					set: { amount: l.amount, currency: l.currency }
				});
	});
}

export async function deleteLimit(userId: string, planId: string, categoryId: string) {
	const plans = db
		.select({ id: spendingPlans.id })
		.from(spendingPlans)
		.where(and(eq(spendingPlans.id, planId), canAccessOwn(userId, spendingPlans)));
	await db
		.delete(planCategoryLimits)
		.where(
			and(eq(planCategoryLimits.categoryId, categoryId), inArray(planCategoryLimits.planId, plans))
		);
}
