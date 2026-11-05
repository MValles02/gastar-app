import { and, desc, eq, gte, ilike, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { categories, financialAccounts, movements } from './db/schema';
import { canAccessAccount, canAccessCategory, canAccessMovement, movementOwnedBy } from './access';
import { sumOfType } from './dashboard-queries';
import { escapeLike } from './db/util';
import { dayStart } from './month';
import type { MovementFilterQuery, MovementRow } from './movements';

export const PAGE_SIZE = 50;

const dest = alias(financialAccounts, 'dest');

/** "YYYY-MM-DD" of the next calendar day. */
const nextDay = (ymd: string) => {
	const [y, m, d] = ymd.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

/** The db or a transaction callback's handle. */
export type DbExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export function createMovement(
	userId: string,
	row: MovementRow & { recurringId?: string | null },
	executor: DbExecutor = db
) {
	return executor
		.insert(movements)
		.values({ ...row, ...movementOwnedBy(userId) })
		.returning({ id: movements.id });
}

/** Movements per category (all time), for ranking the category picker by use. */
export function categoryUsage(userId: string) {
	return db
		.select({ categoryId: movements.categoryId, uses: sql<number>`count(*)`.mapWith(Number) })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(and(canAccessMovement(userId), isNotNull(movements.categoryId)))
		.groupBy(movements.categoryId);
}

/** Single filter predicate shared by the list and its summary (same joins: account, dest, categories). */
function filterWhere(userId: string, query: MovementFilterQuery) {
	const { q, from, to, type, account, category, currency } = query;
	const fromStart = from ? dayStart(from) : null;
	const toEnd = to ? dayStart(nextDay(to)) : null;
	return and(
		canAccessMovement(userId),
		q ? ilike(movements.description, `%${escapeLike(q)}%`) : undefined,
		fromStart ? gte(movements.occurredAt, fromStart) : undefined,
		toEnd ? lt(movements.occurredAt, toEnd) : undefined,
		type ? eq(movements.type, type) : undefined,
		account.length
			? or(inArray(movements.accountId, account), inArray(dest.id, account))
			: undefined,
		category.length ? inArray(movements.categoryId, category) : undefined,
		currency
			? or(
					eq(financialAccounts.currency, currency),
					and(eq(movements.type, 'transfer'), eq(dest.currency, currency))
				)
			: undefined
	);
}

/** Fetches PAGE_SIZE + 1 rows so the caller can tell whether there is a next page. */
export function listMovements(userId: string, query: MovementFilterQuery, page: number) {
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
			destinationCurrency: dest.currency,
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
		.where(filterWhere(userId, query))
		.orderBy(desc(movements.occurredAt), desc(movements.createdAt), desc(movements.id))
		.limit(PAGE_SIZE + 1)
		.offset((page - 1) * PAGE_SIZE);
}

/** Returns an array of 0 or 1 rows, like getAccount/getCategory. */
export function getMovement(userId: string, id: string) {
	return db
		.select({
			id: movements.id,
			type: movements.type,
			occurredAt: movements.occurredAt,
			description: movements.description,
			amount: movements.amount,
			destinationAmount: movements.destinationAmount,
			exchangeRate: movements.exchangeRate,
			accountId: movements.accountId,
			destinationAccountId: movements.destinationAccountId,
			categoryId: movements.categoryId,
			createdAt: movements.createdAt,
			updatedAt: movements.updatedAt,
			accountName: financialAccounts.name,
			accountCurrency: financialAccounts.currency,
			accountIcon: financialAccounts.icon,
			accountColor: financialAccounts.color,
			accountArchivedAt: financialAccounts.archivedAt,
			destinationName: dest.name,
			destinationCurrency: dest.currency,
			destinationIcon: dest.icon,
			destinationColor: dest.color,
			destinationArchivedAt: dest.archivedAt,
			categoryName: categories.name,
			categoryColor: categories.color,
			categoryIcon: categories.icon,
			categoryArchivedAt: categories.archivedAt
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.leftJoin(
			dest,
			and(eq(movements.destinationAccountId, dest.id), canAccessAccount(userId, dest))
		)
		.leftJoin(categories, and(eq(movements.categoryId, categories.id), canAccessCategory(userId)))
		.where(and(eq(movements.id, id), canAccessMovement(userId)))
		.limit(1);
}

const ownedIds = (userId: string) =>
	db
		.select({ id: movements.id })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(canAccessMovement(userId));

/** Never touches `recurring_id`: MovementRow has no such field, so an edit keeps the link. */
export function updateMovement(userId: string, id: string, row: MovementRow) {
	return db
		.update(movements)
		.set({ ...row, updatedAt: new Date() })
		.where(and(eq(movements.id, id), inArray(movements.id, ownedIds(userId))))
		.returning({ id: movements.id });
}

export function deleteMovement(userId: string, id: string, executor: DbExecutor = db) {
	return executor
		.delete(movements)
		.where(and(eq(movements.id, id), inArray(movements.id, ownedIds(userId))))
		.returning({ id: movements.id });
}

/** Per-currency totals over every row the filters match (not just the page). Transfers only count in `count`. */
export function summarizeMovements(userId: string, query: MovementFilterQuery) {
	return db
		.select({
			currency: financialAccounts.currency,
			count: sql<number>`count(*)`.mapWith(Number),
			flows:
				sql<number>`count(*) filter (where ${movements.type} in ('income', 'outcome'))`.mapWith(
					Number
				),
			income: sumOfType('income'),
			outcome: sumOfType('outcome')
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.leftJoin(
			dest,
			and(eq(movements.destinationAccountId, dest.id), canAccessAccount(userId, dest))
		)
		.leftJoin(categories, and(eq(movements.categoryId, categories.id), canAccessCategory(userId)))
		.where(filterWhere(userId, query))
		.groupBy(financialAccounts.currency);
}
