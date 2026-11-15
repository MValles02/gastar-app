import type { Currency } from '$lib/money';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from './db';
import { categories, financialAccounts, movements } from './db/schema';
import { dest, inRange, isIncomeOrOutcome, sumOfType, total, type Range } from './db/sql';
import { canAccessAccount, canAccessMovement, canAccessOwn } from './access';
import { memoPerRequest } from './request-memo';

/** Movements listed under "Movimientos" on the home screen. */
const RECENT_LIMIT = 10;

// No archived filter: archived accounts still count toward the total balance.
/** Per currency: account count and initial balances. Loads only (shared per request, see `memoPerRequest`). */
export const accountSummary = memoPerRequest('accounts', (userId: string) =>
	db
		.select({
			currency: financialAccounts.currency,
			count: sql<number>`count(*)`.mapWith(Number),
			initial: total(financialAccounts.initialBalance)
		})
		.from(financialAccounts)
		.where(canAccessAccount(userId))
		.groupBy(financialAccounts.currency)
);

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
		.innerJoin(
			categories,
			and(eq(movements.categoryId, categories.id), canAccessOwn(userId, categories))
		)
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
		.leftJoin(
			categories,
			and(eq(movements.categoryId, categories.id), canAccessOwn(userId, categories))
		)
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
