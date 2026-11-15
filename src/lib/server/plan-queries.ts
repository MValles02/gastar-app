import { and, desc, eq, inArray, isNotNull, isNull, lte, ne, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, type DbExecutor } from './db';
import {
	categories,
	financialAccounts,
	movements,
	planCategoryLimits,
	recurringMovements,
	spendingPlans
} from './db/schema';
import { appTz, exists, inRange, localMonth, type Range } from './db/sql';
import {
	canAccessAccount,
	canAccessMovement,
	canAccessOwn,
	movementOwnedBy,
	userOwned
} from './access';
import { dayOfMonth } from '$lib/dates';
import { CURRENCIES, roundToStep, type Currency } from '$lib/money';
import { PLAN_CURRENCY } from '$lib/plan';
import type { MovementRow } from './movements';
import type { MovementType } from '$lib/movement';
import { currentMonth, daysInMonth, HISTORY_MONTHS, localDay, monthRange } from './month';
import { activeTotal, isCurrentPlan, normalizeDescription, toPlan } from './plan';

const ownRule = (userId: string, id: string) =>
	and(eq(recurringMovements.id, id), canAccessOwn(userId, recurringMovements));

/** Whether the user has a spending plan (first-run checklist); legacy USD rows do not count. */
export function hasAnyPlan(userId: string) {
	return exists(
		db
			.select({ id: spendingPlans.id })
			.from(spendingPlans)
			.where(and(canAccessOwn(userId, spendingPlans), eq(spendingPlans.currency, PLAN_CURRENCY)))
	);
}

export type RecurringInput = {
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
		.where(
			and(
				canAccessOwn(userId, recurringMovements),
				cur ? eq(financialAccounts.currency, cur) : undefined,
				id ? eq(recurringMovements.id, id) : undefined
			)
		)
		.orderBy(recurringMovements.dayOfMonth, recurringMovements.description);
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

/** Locks the user's rules `ids` in id order (one order everywhere, so two relinks cannot deadlock). */
export async function lockRules(tx: DbExecutor, userId: string, ids: string[]) {
	await tx
		.select({ id: recurringMovements.id })
		.from(recurringMovements)
		.where(and(inArray(recurringMovements.id, ids), canAccessOwn(userId, recurringMovements)))
		.orderBy(recurringMovements.id)
		.for('update');
}

/**
 * Call inside the transaction that deletes or unlinks the movement `id`, before the change: undoes the
 * amount change its link made (rule amount back to `previous_amount`) when the rule still holds that
 * charge's amount and no other linked movement is as recent or more recent. Otherwise leaves the rule.
 */
export async function unlinkRevert(tx: DbExecutor, userId: string, id: string) {
	const [m] = await tx
		.select({
			recurringId: movements.recurringId,
			type: movements.type,
			amount: movements.amount,
			occurredAt: movements.occurredAt,
			currency: financialAccounts.currency
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(and(eq(movements.id, id), canAccessMovement(userId)));
	if (!m?.recurringId || m.type !== 'outcome') return;
	const [rule] = await tx
		.select({
			amount: recurringMovements.amount,
			previousAmount: recurringMovements.previousAmount
		})
		.from(recurringMovements)
		.where(ownRule(userId, m.recurringId))
		.for('update');
	if (!rule || rule.previousAmount === null || rule.amount !== roundToStep(m.amount, m.currency))
		return;
	const [{ latest }] = await tx
		.select({ latest: sql<string | null>`max(${localMonth})` })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(eq(movements.recurringId, m.recurringId), ne(movements.id, id), canAccessMovement(userId))
		);
	if (latest !== null && latest >= localDay(m.occurredAt).slice(0, 7)) return;
	// Another linked charge with the same amount still backs the rule's current amount.
	const others = await tx
		.select({ amount: movements.amount, currency: financialAccounts.currency })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(eq(movements.recurringId, m.recurringId), ne(movements.id, id), canAccessMovement(userId))
		);
	if (others.some((o) => roundToStep(o.amount, o.currency) === rule.amount)) return;
	await tx
		.update(recurringMovements)
		.set({ amount: rule.previousAmount, previousAmount: null, updatedAt: new Date() })
		.where(ownRule(userId, m.recurringId));
}

/**
 * The rule a new income/outcome belongs to (null = none), applying the amount rule: the rule follows
 * the latest linked charge. Call inside the insert's transaction; the rule rows are locked so two
 * concurrent inserts cannot both link the same rule in a month. `explicitRuleId` skips description matching.
 */
export async function linkRuleFor(
	tx: DbExecutor,
	userId: string,
	m: {
		type: MovementType;
		accountId: string;
		occurredAt: Date;
		description: string;
		amount: number;
	},
	explicitRuleId: string | null = null
): Promise<string | null> {
	if (m.type === 'transfer') return null;
	const local = localDay(m.occurredAt);
	const ym = local.slice(0, 7);
	const day = dayOfMonth(local);
	const [account] = await tx
		.select({ currency: financialAccounts.currency })
		.from(financialAccounts)
		.where(and(eq(financialAccounts.id, m.accountId), canAccessAccount(userId)));
	if (!account) return null;

	const candidates = await tx
		.select({
			id: recurringMovements.id,
			description: recurringMovements.description,
			dayOfMonth: recurringMovements.dayOfMonth,
			amount: recurringMovements.amount
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
		.where(
			and(
				canAccessOwn(userId, recurringMovements),
				eq(recurringMovements.type, m.type),
				eq(financialAccounts.currency, account.currency),
				isNull(recurringMovements.archivedAt),
				isNull(financialAccounts.archivedAt),
				isNull(categories.archivedAt),
				explicitRuleId ? eq(recurringMovements.id, explicitRuleId) : undefined
			)
		)
		.for('update', { of: recurringMovements });

	const taken = new Set(
		(await paidRecurring(userId, monthRange(ym), tx)).map((p) => p.recurringId)
	);
	const wanted = normalizeDescription(m.description);
	const dist = (r: { dayOfMonth: number }) =>
		Math.abs(Math.min(r.dayOfMonth, daysInMonth(ym)) - day);
	const rule = candidates
		.filter((r) => !taken.has(r.id))
		.filter((r) => explicitRuleId || normalizeDescription(r.description) === wanted)
		.sort((a, b) => dist(a) - dist(b) || a.dayOfMonth - b.dayOfMonth || (a.id < b.id ? -1 : 1))[0];
	if (!rule) return null;

	const [{ latest }] = await tx
		.select({ latest: sql<string | null>`max(${localMonth})` })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(and(eq(movements.recurringId, rule.id), canAccessMovement(userId)));
	const target = roundToStep(m.amount, account.currency);
	// Only payments update the rule: an income (a salary paid in parts) never changes its amount.
	if (
		m.type === 'outcome' &&
		target > 0 &&
		target !== rule.amount &&
		(latest === null || ym >= latest)
	)
		await tx
			.update(recurringMovements)
			.set({ amount: target, previousAmount: rule.amount, updatedAt: new Date() })
			.where(ownRule(userId, rule.id));
	return rule.id;
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

// --- Spending plans ---

/** The user's plan when it is the current one (a plan for another month counts as none). */
export async function currentPlan(userId: string) {
	const [plan] = await getPlan(userId);
	return plan && isCurrentPlan(plan, currentMonth(new Date())) ? plan : null;
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

/** `planLimits` of the user's plan, so it can run alongside \`getPlan\`. */
export function currentPlanLimits(userId: string) {
	return limitRows(userId, eq(spendingPlans.currency, PLAN_CURRENCY));
}

/** The most recent ARS<->USD transfer's rate (not in the future); null when there is none. */
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

/** The plan's rate: the manual one when set, else the latest transfer's. `day` is that transfer's "YYYY-MM-DD". */
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

/** Thrown inside `upsertLimits` to roll it back; the message is shown to the user. */
export class PlanRejected extends Error {}

export function deletePlan(userId: string) {
	return db
		.delete(spendingPlans)
		.where(and(canAccessOwn(userId, spendingPlans), eq(spendingPlans.currency, PLAN_CURRENCY)))
		.returning({ id: spendingPlans.id });
}

/** Active recurring income in plan pesos: ARS rules plus USD rules at the plan rate (left out without one). */
export async function planIncome(userId: string) {
	const [rules, rate] = await Promise.all([listRecurring(userId), planRate(userId)]);
	return CURRENCIES.reduce(
		(sum, cur) =>
			sum +
			(toPlan(
				activeTotal(
					rules.filter((r) => r.currency === cur),
					'income'
				),
				cur,
				rate.value
			) ?? 0),
		0
	);
}

export type PlanSavings = { savings: number; savingsPercent: number | null; month: string | null };

export function upsertPlan(userId: string, v: PlanSavings) {
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
	patch: Partial<PlanSavings & { exchangeRate: number | null }>
) {
	return db
		.update(spendingPlans)
		.set({ ...patch, updatedAt: new Date() })
		.where(and(canAccessOwn(userId, spendingPlans), eq(spendingPlans.currency, PLAN_CURRENCY)))
		.returning({ id: spendingPlans.id });
}

/** Sets the limits of the user's plan `planId` (insert or overwrite per category), in one transaction. */
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
