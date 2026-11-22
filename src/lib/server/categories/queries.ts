import { and, asc, eq, ilike, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import type { PgSelectBase, SelectedFields } from 'drizzle-orm/pg-core';
import { db } from '../db';
import { categories, financialAccounts, movements } from '../db/schema';
import { canAccessMovement, canAccessOwn, userOwned } from '../access';
import { PG_UNIQUE_VIOLATION, pgErrorCode } from '../db/errors';
import { escapeLike } from '../db/util';
import { exists, inRange, isIncomeOrOutcome, sumOfType, type Range } from '../db/sql';
import type { CategoryData } from './form';
import { kindFits, type CategoryKind } from '#lib/movement.ts';

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

export function isCategoryReferenced(userId: string, id: string) {
	return exists(
		db
			.select({ id: movements.id })
			.from(movements)
			.innerJoin(categories, eq(movements.categoryId, categories.id))
			.where(and(eq(categories.id, id), canAccessOwn(userId, categories)))
	);
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

/**
 * Income/outcome movements in the user's own categories, with the origin account joined for
 * canAccessMovement. Callers pick the fields, add extra conditions and a groupBy.
 */
export function categorizedMovements<T extends SelectedFields>(
	userId: string,
	fields: T,
	...where: (SQL | undefined)[]
) {
	// Typed with the generic `fields` the builder's join methods do not resolve, so the query is built
	// over plain SelectedFields and re-typed to the caller's `fields` (so rows keep their inferred type).
	return db
		.select(fields as SelectedFields)
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(categories, eq(movements.categoryId, categories.id))
		.where(
			and(canAccessMovement(userId), canAccessOwn(userId, categories), isIncomeOrOutcome, ...where)
		)
		.$dynamic() as unknown as PgSelectBase<
		'movements',
		T,
		'partial',
		{ movements: 'not-null'; financial_accounts: 'not-null'; categories: 'not-null' },
		true
	>;
}

export function categoryMonthNet(userId: string, id: string, range: Range) {
	return categorizedMovements(
		userId,
		{
			currency: financialAccounts.currency,
			outcome: sumOfType('outcome'),
			income: sumOfType('income')
		},
		eq(categories.id, id),
		inRange(range)
	).groupBy(financialAccounts.currency);
}

/** Income and outcome totals per category and currency for a range, never summed across currencies. */
export function categoryMonthTotals(userId: string, range: Range) {
	return categorizedMovements(
		userId,
		{
			categoryId: movements.categoryId,
			currency: financialAccounts.currency,
			outcome: sumOfType('outcome'),
			income: sumOfType('income')
		},
		inRange(range)
	).groupBy(movements.categoryId, financialAccounts.currency);
}

export function categoryMovementTypes(userId: string, id: string) {
	return categorizedMovements(userId, { type: movements.type }, eq(categories.id, id)).groupBy(
		movements.type
	);
}

/** Whether a kind is allowed for the category: only when every one of its movements fits it. */
export async function kindLock(userId: string, id: string) {
	const types = (await categoryMovementTypes(userId, id)).map((r) => r.type);
	return (kind: CategoryKind | null) => types.every((t) => kindFits(kind, t));
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
