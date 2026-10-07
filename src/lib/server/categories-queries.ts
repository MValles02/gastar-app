import { and, asc, eq, gte, ilike, inArray, isNull, lt, ne, sql } from 'drizzle-orm';
import { db } from './db';
import { categories, financialAccounts, movements } from './db/schema';
import { canAccessCategory, canAccessMovement, categoryOwnedBy } from './access';
import { escapeLike } from './db/util';
import type { CategoryData } from './categories';

export function listCategories(userId: string, opts: { q?: string; archived?: boolean } = {}) {
	return db
		.select()
		.from(categories)
		.where(
			and(
				canAccessCategory(userId),
				opts.archived ? undefined : isNull(categories.archivedAt),
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
		.where(canAccessCategory(userId))
		.limit(1);
}

export function getCategory(userId: string, id: string) {
	return db
		.select()
		.from(categories)
		.where(and(eq(categories.id, id), canAccessCategory(userId)))
		.limit(1);
}

export function categoryReferenced(userId: string, id: string) {
	return db
		.select({ id: movements.id })
		.from(movements)
		.innerJoin(categories, eq(movements.categoryId, categories.id))
		.where(and(eq(categories.id, id), canAccessCategory(userId)))
		.limit(1);
}

export function categoryNameTaken(userId: string, name: string, exceptId?: string) {
	return db
		.select({ id: categories.id })
		.from(categories)
		.where(
			and(
				canAccessCategory(userId),
				sql`lower(${categories.name}) = lower(${name})`,
				exceptId ? ne(categories.id, exceptId) : undefined
			)
		)
		.limit(1);
}

export function categoryMonthNet(userId: string, id: string, range: { start: Date; end: Date }) {
	const sumOf = (type: 'outcome' | 'income') =>
		sql<number>`coalesce(sum(${movements.amount}) filter (where ${movements.type} = ${type}), 0)`.mapWith(
			Number
		);
	return db
		.select({
			currency: financialAccounts.currency,
			outcome: sumOf('outcome'),
			income: sumOf('income')
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(categories, eq(movements.categoryId, categories.id))
		.where(
			and(
				canAccessMovement(userId),
				canAccessCategory(userId),
				eq(categories.id, id),
				inArray(movements.type, ['income', 'outcome']),
				gte(movements.occurredAt, range.start),
				lt(movements.occurredAt, range.end)
			)
		)
		.groupBy(financialAccounts.currency);
}

export function createCategory(userId: string, data: CategoryData) {
	return db
		.insert(categories)
		.values({ ...data, ...categoryOwnedBy(userId) })
		.returning({ id: categories.id });
}

export function updateCategory(userId: string, id: string, data: CategoryData) {
	return db
		.update(categories)
		.set(data)
		.where(and(eq(categories.id, id), canAccessCategory(userId)))
		.returning({ id: categories.id });
}

export function deleteCategory(userId: string, id: string) {
	return db
		.delete(categories)
		.where(and(eq(categories.id, id), canAccessCategory(userId)))
		.returning({ id: categories.id });
}

export function setCategoryArchived(userId: string, id: string, at: Date | null) {
	return db
		.update(categories)
		.set({ archivedAt: at })
		.where(and(eq(categories.id, id), canAccessCategory(userId)))
		.returning({ id: categories.id });
}
