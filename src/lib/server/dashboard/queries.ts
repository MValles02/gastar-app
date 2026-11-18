import type { Currency } from '#lib/money.ts';
import { and, desc, eq, or } from 'drizzle-orm';
import { db } from '../db';
import { categories, financialAccounts, movements } from '../db/schema';
import {
	dest,
	inRange,
	isIncomeOrOutcome,
	localMonth,
	sumOfType,
	total,
	type Range
} from '../db/sql';
import { canAccessMovement, canAccessOwn, ownedDestination } from '../access';

const RECENT_LIMIT = 10;

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
		.innerJoin(dest, ownedDestination(userId))
		.where(and(canAccessMovement(userId), eq(dest.currency, cur)));
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
		.leftJoin(dest, ownedDestination(userId))
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

/** Per local month income and outcome in one currency; transfers never count. */
export function monthlyFlows(userId: string, cur: Currency, range: Range) {
	return db
		.select({ month: localMonth, income: sumOfType('income'), outcome: sumOfType('outcome') })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(
				canAccessMovement(userId),
				eq(financialAccounts.currency, cur),
				isIncomeOrOutcome,
				inRange(range)
			)
		)
		.groupBy(localMonth);
}

export function biggestOutcome(userId: string, cur: Currency, range: Range) {
	return db
		.select({
			id: movements.id,
			description: movements.description,
			amount: movements.amount,
			occurredAt: movements.occurredAt,
			categoryName: categories.name
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.leftJoin(
			categories,
			and(eq(movements.categoryId, categories.id), canAccessOwn(userId, categories))
		)
		.where(
			and(
				canAccessMovement(userId),
				eq(financialAccounts.currency, cur),
				eq(movements.type, 'outcome'),
				inRange(range)
			)
		)
		.orderBy(desc(movements.amount), desc(movements.occurredAt), desc(movements.id))
		.limit(1);
}
