import type { Currency } from '$lib/money';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { categories, financialAccounts, movements } from './db/schema';
import { canAccessCategory, canAccessMovement } from './access';
import { inRange, isIncomeOrOutcome, sumOfType, type Range } from './dashboard-queries';
import { APP_TZ } from '$lib/locale';

// sql.raw: a bound parameter would make SELECT and GROUP BY expressions differ.
const localMonth = sql<string>`to_char(${movements.occurredAt} at time zone ${sql.raw(`'${APP_TZ}'`)}, 'YYYY-MM')`;

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
		.leftJoin(categories, and(eq(movements.categoryId, categories.id), canAccessCategory(userId)))
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
