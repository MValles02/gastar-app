import { getRequestEvent } from '$app/server';
import type { Currency } from '$lib/money';
import { and, desc, eq, gte, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { categories, financialAccounts, movements, spendingPlans } from './db/schema';
import { canAccessAccount, canAccessCategory, canAccessMovement, canAccessPlan } from './access';
import { PLAN_CURRENCY } from '$lib/plan';

export type Range = { start: Date; end: Date };

/** Movements listed under "Movimientos" on the home screen. */
const RECENT_LIMIT = 10;

const dest = alias(financialAccounts, 'dest');
const total = (col: unknown) => sql<number>`coalesce(sum(${col}), 0)`.mapWith(Number);

export const inRange = (range?: Range) =>
	range
		? and(gte(movements.occurredAt, range.start), lt(movements.occurredAt, range.end))
		: undefined;

/** Income and outcome only: transfers never count as spending or earning. */
export const isIncomeOrOutcome = or(eq(movements.type, 'income'), eq(movements.type, 'outcome'));

/** Sum of movement amounts of one type within the group (0 when none). */
export const sumOfType = (type: 'income' | 'outcome') =>
	sql<number>`coalesce(sum(${movements.amount}) filter (where ${movements.type} = ${type}), 0)`.mapWith(
		Number
	);

const requestMemo = new WeakMap<object, Map<string, Promise<unknown>>>();

/**
 * Shares the promise of `run` between the loads of one request (keyed on `locals`). For loads only:
 * a form action must not cache data it is about to mutate. Needs a request: `getRequestEvent` throws outside one.
 */
export function memoPerRequest<T>(key: string, run: () => Promise<T>): Promise<T> {
	const { locals } = getRequestEvent();
	let memo = requestMemo.get(locals);
	if (!memo) requestMemo.set(locals, (memo = new Map()));
	let hit = memo.get(key);
	if (!hit) memo.set(key, (hit = run()));
	return hit as Promise<T>;
}

// No archived filter: archived accounts still count toward the total balance.
/** Per currency: account count and initial balances. Loads only (shared per request, see `memoPerRequest`). */
export function accountSummary(userId: string) {
	return memoPerRequest(`accounts:${userId}`, () => accountSummaryQuery(userId));
}

function accountSummaryQuery(userId: string) {
	return db
		.select({
			currency: financialAccounts.currency,
			count: sql<number>`count(*)`.mapWith(Number),
			initial: total(financialAccounts.initialBalance)
		})
		.from(financialAccounts)
		.where(canAccessAccount(userId))
		.groupBy(financialAccounts.currency);
}

export function originTypeSums(userId: string, cur: Currency, range?: Range) {
	return db
		.select({ type: movements.type, amount: total(movements.amount) })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(and(canAccessMovement(userId), eq(financialAccounts.currency, cur), inRange(range)))
		.groupBy(movements.type);
}

export function transfersInSum(userId: string, cur: Currency) {
	return db
		.select({ amount: total(movements.destinationAmount) })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(dest, eq(movements.destinationAccountId, dest.id))
		.where(and(canAccessMovement(userId), canAccessAccount(userId, dest), eq(dest.currency, cur)));
}

export function categorySums(userId: string, cur: Currency, range: Range) {
	return db
		.select({
			id: categories.id,
			name: categories.name,
			color: categories.color,
			icon: categories.icon,
			outcome: sumOfType('outcome'),
			income: sumOfType('income')
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(categories, and(eq(movements.categoryId, categories.id), canAccessCategory(userId)))
		.where(
			and(
				canAccessMovement(userId),
				eq(financialAccounts.currency, cur),
				isIncomeOrOutcome,
				inRange(range)
			)
		)
		.groupBy(categories.id, categories.name, categories.color, categories.icon);
}

/** Whether the user has any movement, in any currency (first-run checklist). */
export async function hasAnyMovement(userId: string) {
	const rows = await db
		.select({ id: movements.id })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(canAccessMovement(userId))
		.limit(1);
	return rows.length > 0;
}

/** Whether the user has a spending plan (first-run checklist); legacy USD rows do not count. */
export async function hasAnyPlan(userId: string) {
	const rows = await db
		.select({ id: spendingPlans.id })
		.from(spendingPlans)
		.where(and(canAccessPlan(userId), eq(spendingPlans.currency, PLAN_CURRENCY)))
		.limit(1);
	return rows.length > 0;
}

export function recentMovements(userId: string, cur?: Currency) {
	return db
		.select({
			id: movements.id,
			type: movements.type,
			description: movements.description,
			occurredAt: movements.occurredAt,
			amount: movements.amount,
			destinationAmount: movements.destinationAmount,
			accountName: financialAccounts.name,
			accountCurrency: financialAccounts.currency,
			destinationAccountName: dest.name,
			categoryIcon: categories.icon,
			categoryColor: categories.color
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.leftJoin(
			dest,
			and(eq(movements.destinationAccountId, dest.id), canAccessAccount(userId, dest))
		)
		.leftJoin(categories, and(eq(movements.categoryId, categories.id), canAccessCategory(userId)))
		.where(
			and(
				canAccessMovement(userId),
				cur
					? or(
							eq(financialAccounts.currency, cur),
							and(eq(movements.type, 'transfer'), eq(dest.currency, cur))
						)
					: undefined
			)
		)
		.orderBy(desc(movements.occurredAt), desc(movements.createdAt), desc(movements.id))
		.limit(RECENT_LIMIT);
}
