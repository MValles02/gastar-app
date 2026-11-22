import type { Currency } from '#lib/money.ts';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { categories, financialAccounts, movements } from '../db/schema';
import { inRange, isIncomeOrOutcome, localMonth, sumOfType, type Range } from '../db/sql';
import { canAccessMovement, canAccessOwn } from '../access';
import { categorizedMovements } from '../categories/queries';

export function categorySums(userId: string, cur: Currency, range: Range) {
	return categorizedMovements(
		userId,
		{
			id: categories.id,
			name: categories.name,
			color: categories.color,
			icon: categories.icon,
			outcome: sumOfType('outcome'),
			income: sumOfType('income')
		},
		eq(financialAccounts.currency, cur),
		inRange(range)
	).groupBy(categories.id, categories.name, categories.color, categories.icon);
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
