import type { Currency } from '$lib/money';
import { and, desc, eq, gte, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { categories, financialAccounts, movements } from './db/schema';
import { canAccessAccount, canAccessCategory, canAccessMovement } from './access';

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

// No archived filter: archived accounts still count toward the total balance.
export function accountSummary(userId: string) {
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
		.groupBy(categories.id, categories.name, categories.color);
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
			categoryName: categories.name
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
