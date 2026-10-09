import type { Currency } from '$lib/money';
import { and, asc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from './db';
import { financialAccounts, movements } from './db/schema';
import { canAccessAccount, canAccessMovement, ownedBy } from './access';
import { alias } from 'drizzle-orm/pg-core';
import { type AccountData } from './accounts';
import { escapeLike } from './db/util';

const dest = alias(financialAccounts, 'dest');
const total = (col: unknown) => sql<number>`coalesce(sum(${col}), 0)`.mapWith(Number);
const ownedAccount = (userId: string, id: string) =>
	and(eq(financialAccounts.id, id), canAccessAccount(userId));
const returningId = { id: financialAccounts.id };

export function listAccounts(
	userId: string,
	opts: { q?: string; currency?: Currency; archived?: boolean } = {}
) {
	return db
		.select()
		.from(financialAccounts)
		.where(
			and(
				canAccessAccount(userId),
				opts.archived ? undefined : isNull(financialAccounts.archivedAt),
				opts.currency ? eq(financialAccounts.currency, opts.currency) : undefined,
				opts.q ? ilike(financialAccounts.name, `%${escapeLike(opts.q)}%`) : undefined
			)
		)
		.orderBy(asc(financialAccounts.name));
}

export function getAccount(userId: string, id: string) {
	return db.select().from(financialAccounts).where(ownedAccount(userId, id)).limit(1);
}

export function accountOriginSums(userId: string, id?: string) {
	return db
		.select({
			accountId: movements.accountId,
			type: movements.type,
			amount: total(movements.amount)
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(and(canAccessMovement(userId), id ? eq(movements.accountId, id) : undefined))
		.groupBy(movements.accountId, movements.type);
}

export function accountTransfersIn(userId: string, id?: string) {
	return db
		.select({
			accountId: movements.destinationAccountId,
			amount: total(movements.destinationAmount)
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(dest, eq(movements.destinationAccountId, dest.id))
		.where(
			and(
				canAccessMovement(userId),
				canAccessAccount(userId, dest),
				id ? eq(movements.destinationAccountId, id) : undefined
			)
		)
		.groupBy(movements.destinationAccountId);
}

/** Whether any movement uses the account as origin or destination. */
export async function isAccountReferenced(userId: string, id: string) {
	const rows = await db
		.select({ id: movements.id })
		.from(movements)
		.innerJoin(
			financialAccounts,
			or(
				eq(movements.accountId, financialAccounts.id),
				eq(movements.destinationAccountId, financialAccounts.id)
			)
		)
		.where(ownedAccount(userId, id))
		.limit(1);
	return rows.length > 0;
}

export function createAccount(userId: string, data: AccountData & { currency: Currency }) {
	return db
		.insert(financialAccounts)
		.values({ ...data, ...ownedBy(userId) })
		.returning(returningId);
}

/**
 * When `data.currency` differs from the stored one, the UPDATE only matches if no movement
 * references the account, so a concurrent movement insert cannot slip past the lock.
 * 0 returned rows means not found, not owned, or currency locked.
 */
export function updateAccount(userId: string, id: string, data: AccountData) {
	const lock = data.currency
		? or(
				eq(financialAccounts.currency, data.currency),
				sql`not exists (select 1 from ${movements} where ${movements.accountId} = "financial_accounts"."id" or ${movements.destinationAccountId} = "financial_accounts"."id")`
			)
		: undefined;
	return db
		.update(financialAccounts)
		.set(data)
		.where(and(ownedAccount(userId, id), lock))
		.returning(returningId);
}

export function deleteAccount(userId: string, id: string) {
	return db.delete(financialAccounts).where(ownedAccount(userId, id)).returning(returningId);
}

export function setArchived(userId: string, id: string, at: Date | null) {
	return db
		.update(financialAccounts)
		.set({ archivedAt: at })
		.where(ownedAccount(userId, id))
		.returning(returningId);
}
