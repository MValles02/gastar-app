import { and, asc, eq, ilike, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { categories, financialAccounts, movements } from '../db/schema';
import { canAccessMovement, canAccessOwn, userOwned } from '../access';
import { PG_UNIQUE_VIOLATION, pgErrorCode } from '../db/errors';
import { escapeLike } from '../db/util';
import { inRange, isIncomeOrOutcome, sumOfType, type Range } from '../db/sql';
import type { CategoryData } from './form';
import type { Currency } from '$lib/money';

export function listCategories(
	userId: string,
	opts: { q?: string; archived?: boolean; kind?: 'income' | 'outcome' } = {}
) {
	return db
		.select()
		.from(categories)
		.where(
			and(
				canAccessOwn(userId, categories),
				opts.archived ? undefined : isNull(categories.archivedAt),
				opts.kind ? or(eq(categories.kind, opts.kind), isNull(categories.kind)) : undefined,
				opts.q ? ilike(categories.name, `%${escapeLike(opts.q)}%`) : undefined
			)
		)
		.orderBy(asc(categories.name));
}

/** Includes archived categories. */
export function hasAnyCategory(userId: string) {
	return db
		.select({ id: categories.id })
		.from(categories)
		.where(canAccessOwn(userId, categories))
		.limit(1);
}

export function getCategory(userId: string, id: string) {
	return db
		.select()
		.from(categories)
		.where(and(eq(categories.id, id), canAccessOwn(userId, categories)))
		.limit(1);
}

/** Whether any movement uses the category. */
export async function isCategoryReferenced(userId: string, id: string) {
	const rows = await db
		.select({ id: movements.id })
		.from(movements)
		.innerJoin(categories, eq(movements.categoryId, categories.id))
		.where(and(eq(categories.id, id), canAccessOwn(userId, categories)))
		.limit(1);
	return rows.length > 0;
}

function categoryNameTaken(userId: string, name: string, exceptId?: string) {
	return db
		.select({ id: categories.id })
		.from(categories)
		.where(
			and(
				canAccessOwn(userId, categories),
				sql`lower(${categories.name}) = lower(${name})`,
				exceptId ? ne(categories.id, exceptId) : undefined
			)
		)
		.limit(1);
}

/**
 * Runs `write` unless another of the user's categories already has this name (case-insensitive).
 * The unique index still catches a concurrent write that lands between the check and `write`.
 * Returns null when the name is taken.
 */
export async function writeIfNameFree<T>(
	userId: string,
	name: string,
	write: () => Promise<T>,
	exceptId?: string
): Promise<T | null> {
	if ((await categoryNameTaken(userId, name, exceptId)).length > 0) return null;
	try {
		return await write();
	} catch (e) {
		if (pgErrorCode(e) === PG_UNIQUE_VIOLATION) return null;
		throw e;
	}
}

export function categoryMonthNet(userId: string, id: string, range: Range) {
	return db
		.select({
			currency: financialAccounts.currency,
			outcome: sumOfType('outcome'),
			income: sumOfType('income')
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(categories, eq(movements.categoryId, categories.id))
		.where(
			and(
				canAccessMovement(userId),
				canAccessOwn(userId, categories),
				eq(categories.id, id),
				isIncomeOrOutcome,
				inRange(range)
			)
		)
		.groupBy(financialAccounts.currency);
}

/** Net per currency (outcomes minus incomes) from categoryMonthNet rows, ARS first. Never sums across currencies. */
export function toCurrencyNets(
	rows: { currency: Currency; outcome: number; income: number }[]
): { currency: Currency; net: number }[] {
	return rows
		.map((r) => ({ currency: r.currency, net: r.outcome - r.income }))
		.sort((a, b) => (a.currency === b.currency ? 0 : a.currency === 'ARS' ? -1 : 1));
}

/** Income and outcome totals per category and currency for a range, never summed across currencies. */
export function categoryMonthTotals(userId: string, range: Range) {
	return db
		.select({
			categoryId: movements.categoryId,
			currency: financialAccounts.currency,
			outcome: sumOfType('outcome'),
			income: sumOfType('income')
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(categories, eq(movements.categoryId, categories.id))
		.where(
			and(
				canAccessMovement(userId),
				canAccessOwn(userId, categories),
				isIncomeOrOutcome,
				inRange(range)
			)
		)
		.groupBy(movements.categoryId, financialAccounts.currency);
}

/** Distinct income/outcome movement types recorded on a category (empty when it has none). */
export function categoryMovementTypes(userId: string, id: string) {
	return db
		.selectDistinct({ type: movements.type })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(categories, eq(movements.categoryId, categories.id))
		.where(
			and(
				canAccessMovement(userId),
				canAccessOwn(userId, categories),
				eq(categories.id, id),
				isIncomeOrOutcome
			)
		);
}

export function createCategory(userId: string, data: CategoryData) {
	return db
		.insert(categories)
		.values({ ...data, ...userOwned(userId) })
		.returning({ id: categories.id });
}

export function updateCategory(userId: string, id: string, data: CategoryData) {
	return db
		.update(categories)
		.set(data)
		.where(and(eq(categories.id, id), canAccessOwn(userId, categories)))
		.returning({ id: categories.id });
}

export function deleteCategory(userId: string, id: string) {
	return db
		.delete(categories)
		.where(and(eq(categories.id, id), canAccessOwn(userId, categories)))
		.returning({ id: categories.id });
}

export function setCategoryArchived(userId: string, id: string, at: Date | null) {
	return db
		.update(categories)
		.set({ archivedAt: at })
		.where(and(eq(categories.id, id), canAccessOwn(userId, categories)))
		.returning({ id: categories.id });
}
