import type { Currency } from '$lib/money';
import { and, desc, eq } from 'drizzle-orm';
import { db } from './db';
import { categories, financialAccounts, movements } from './db/schema';
import { canAccessMovement, canAccessOwn } from './access';
import { inRange, isIncomeOrOutcome, localMonth, sumOfType, type Range } from './db/sql';

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
