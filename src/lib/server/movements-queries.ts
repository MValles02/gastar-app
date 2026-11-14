import { and, desc, eq, gte, ilike, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { categories, financialAccounts, movements } from './db/schema';
import { canAccessAccount, canAccessCategory, canAccessMovement, movementOwnedBy } from './access';
import { sumOfType } from './dashboard-queries';
import { linkRuleFor, lockRules, unlinkRevert } from './plan-queries';
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
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbExecutor = Tx | typeof db;

/**
 * Inserts an income/outcome/transfer. The link to a fixed-payment rule is decided first (explicit
 * `ruleId` or description match, `linkRuleFor`) and written in the same INSERT, inside one transaction
 * (the caller's `tx` or its own); a later UPDATE would bump updated_at and break undoApproval's check.
 */
export function createMovement(
	userId: string,
	row: MovementRow,
	opts: { tx?: Tx; ruleId?: string | null } = {}
) {
	const run = async (tx: Tx) => {
		const recurringId = await linkRuleFor(tx, userId, row, opts.ruleId ?? null);
		return tx
			.insert(movements)
			.values({ ...row, ...movementOwnedBy(userId), recurringId })
			.returning({ id: movements.id });
	};
	return opts.tx ? run(opts.tx) : db.transaction(run);
}

/**
 * Links an existing movement to a rule (`ruleId`) or unlinks it (null); same constraints as a new one
 * (type, currency, one linked movement per rule per month). 'taken' = the rule cannot take it.
 */
export function setMovementRule(
	userId: string,
	id: string,
	ruleId: string | null
): Promise<'linked' | 'unlinked' | 'taken' | 'missing'> {
	return db.transaction(async (tx) => {
		const [m] = await tx
			.select({
				type: movements.type,
				accountId: movements.accountId,
				occurredAt: movements.occurredAt,
				description: movements.description,
				amount: movements.amount,
				recurringId: movements.recurringId
			})
			.from(movements)
			.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
			.where(and(eq(movements.id, id), canAccessMovement(userId)))
			.for('update', { of: movements });
		if (!m || (m.type === 'transfer' && ruleId)) return 'missing';
		const owned = and(eq(movements.id, id), inArray(movements.id, ownedIds(userId)));
		if (!ruleId) {
			await unlinkRevert(tx, userId, id);
			await tx.update(movements).set({ recurringId: null }).where(owned);
			return 'unlinked';
		}
		if (ruleId === m.recurringId) return 'linked';
		// Relinking A to B touches both rules: lock them in one order first.
		if (m.recurringId) await lockRules(tx, userId, [m.recurringId, ruleId]);
		if (!(await linkRuleFor(tx, userId, m, ruleId))) return 'taken';
		await unlinkRevert(tx, userId, id);
		await tx.update(movements).set({ recurringId: ruleId }).where(owned);
		return 'linked';
	});
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
			recurringId: movements.recurringId,
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

/** Deletes the movement; a rule amount its link changed goes back (`unlinkRevert`) in the same transaction. */
export function deleteMovement(userId: string, id: string, tx?: Tx) {
	const run = async (t: Tx) => {
		await unlinkRevert(t, userId, id);
		return t
			.delete(movements)
			.where(and(eq(movements.id, id), inArray(movements.id, ownedIds(userId))))
			.returning({ id: movements.id });
	};
	return tx ? run(tx) : db.transaction(run);
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
