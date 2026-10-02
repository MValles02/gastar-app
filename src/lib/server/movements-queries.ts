import { and, desc, eq, gte, ilike, inArray, lt, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { categories, financialAccounts, movements } from './db/schema';
import { canAccessAccount, canAccessCategory, canAccessMovement, movementOwnedBy } from './access';
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

export function createMovement(userId: string, row: MovementRow) {
	return db
		.insert(movements)
		.values({ ...row, ...movementOwnedBy(userId) })
		.returning({ id: movements.id });
}

/** Fetches PAGE_SIZE + 1 rows so the caller can tell whether there is a next page. */
export function listMovements(userId: string, query: MovementFilterQuery, page: number) {
	const { q, from, to, type, account, category, currency } = query;
	const fromStart = from ? dayStart(from) : null;
	const toEnd = to ? dayStart(nextDay(to)) : null;
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
			categoryName: categories.name
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.leftJoin(
			dest,
			and(eq(movements.destinationAccountId, dest.id), canAccessAccount(userId, dest))
		)
		.leftJoin(categories, and(eq(movements.categoryId, categories.id), canAccessCategory(userId)))
		.where(
			and(
				canAccessMovement(userId),
				q ? ilike(movements.description, `%${escapeLike(q)}%`) : undefined,
				fromStart ? gte(movements.occurredAt, fromStart) : undefined,
				toEnd ? lt(movements.occurredAt, toEnd) : undefined,
				type ? eq(movements.type, type) : undefined,
				account ? or(eq(movements.accountId, account), eq(dest.id, account)) : undefined,
				category ? eq(movements.categoryId, category) : undefined,
				currency
					? or(
							eq(financialAccounts.currency, currency),
							and(eq(movements.type, 'transfer'), eq(dest.currency, currency))
						)
					: undefined
			)
		)
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

export function updateMovement(userId: string, id: string, row: MovementRow) {
	return db
		.update(movements)
		.set({ ...row, updatedAt: new Date() })
		.where(and(eq(movements.id, id), inArray(movements.id, ownedIds(userId))))
		.returning({ id: movements.id });
}

export function deleteMovement(userId: string, id: string) {
	return db
		.delete(movements)
		.where(and(eq(movements.id, id), inArray(movements.id, ownedIds(userId))))
		.returning({ id: movements.id });
}
