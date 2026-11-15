import { and, eq, gte, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { APP_TZ } from '$lib/locale';
import { financialAccounts, movements } from './schema';

/** Half-open: start inclusive, end exclusive. */
export type Range = { start: Date; end: Date };

/** A movement's destination account, for transfers. */
export const dest = alias(financialAccounts, 'dest');

/** Sum of a column, 0 when there are no rows. */
export const total = (col: unknown) => sql<number>`coalesce(sum(${col}), 0)`.mapWith(Number);

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

// APP_TZ is inlined as a literal: a bound parameter makes SELECT and GROUP BY different expressions.
export const appTz = sql.raw(`'${APP_TZ}'`);

/** A movement's local month, "YYYY-MM". */
export const localMonth = sql<string>`to_char(${movements.occurredAt} at time zone ${appTz}, 'YYYY-MM')`;

/** Whether `query` returns at least one row (runs it with LIMIT 1). */
export async function exists(query: {
	limit(n: number): PromiseLike<unknown[]>;
}): Promise<boolean> {
	return (await query.limit(1)).length > 0;
}
