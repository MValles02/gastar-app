import { and, desc, eq, gte, lt, or, sql } from 'drizzle-orm';
import { db } from './db';
import { categories, financialAccounts, movements } from './db/schema';
import { canAccessCategory, canAccessMovement } from './access';
import { TZ } from './month';

type Currency = 'ARS' | 'USD';
type Range = { start: Date; end: Date };

// sql.raw: a bound parameter would make SELECT and GROUP BY expressions differ.
const localMonth = sql<string>`to_char(${movements.occurredAt} at time zone ${sql.raw(`'${TZ}'`)}, 'YYYY-MM')`;

const inRange = (range: Range) =>
	and(gte(movements.occurredAt, range.start), lt(movements.occurredAt, range.end));

/** Per local month income and outcome in one currency; transfers never count. */
export function monthlyFlows(userId: string, cur: Currency, range: Range) {
	const sumOf = (t: 'income' | 'outcome') =>
		sql<number>`coalesce(sum(${movements.amount}) filter (where ${movements.type} = ${t}), 0)`.mapWith(
			Number
		);
	return db
		.select({ month: localMonth, income: sumOf('income'), outcome: sumOf('outcome') })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(
				canAccessMovement(userId),
				eq(financialAccounts.currency, cur),
				or(eq(movements.type, 'income'), eq(movements.type, 'outcome')),
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
