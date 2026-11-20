import type { Currency } from '#lib/money.ts';
import { accountLook } from '#lib/appearance.ts';
import { and, asc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { financialAccounts, movements } from '../db/schema';
import { dest, inRange, total, type Range } from '../db/sql';
import { canAccessAccount, canAccessMovement, ownedBy, ownedDestination } from '../access';
import { memoPerRequest } from '../request-memo';
import type { AccountData } from './form';
import { escapeLike } from '../db/util';

const ownedAccount = (userId: string, id: string) =>
	and(eq(financialAccounts.id, id), canAccessAccount(userId));
const returningId = { id: financialAccounts.id };

// No archived filter: archived accounts still count toward the total balance.
/** Per currency: account count and initial balances. Loads only (shared per request, see `memoPerRequest`). */
export const accountSummary = memoPerRequest('accounts', (userId: string) =>
	db
		.select({
			currency: financialAccounts.currency,
			count: sql<number>`count(*)`.mapWith(Number),
			initial: total(financialAccounts.initialBalance)
		})
		.from(financialAccounts)
		.where(canAccessAccount(userId))
		.groupBy(financialAccounts.currency)
);

export const accountOption = (a: {
	id: string;
	name: string;
	icon: string | null;
	color: string | null;
}) => ({ id: a.id, name: a.name, ...accountLook(a) });

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

export function accountOriginSums(
	userId: string,
	opts: { id?: string; currency?: Currency; range?: Range } = {}
) {
	return db
		.select({
			accountId: movements.accountId,
			type: movements.type,
			amount: total(movements.amount)
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(
				canAccessMovement(userId),
				opts.id ? eq(movements.accountId, opts.id) : undefined,
				opts.currency ? eq(financialAccounts.currency, opts.currency) : undefined,
				inRange(opts.range)
			)
		)
		.groupBy(movements.accountId, movements.type);
}

export function accountTransfersIn(
	userId: string,
	opts: { id?: string; currency?: Currency } = {}
) {
	return db
		.select({
			accountId: movements.destinationAccountId,
			amount: total(movements.destinationAmount)
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(dest, ownedDestination(userId))
		.where(
			and(
				canAccessMovement(userId),
				opts.id ? eq(movements.destinationAccountId, opts.id) : undefined,
				opts.currency ? eq(dest.currency, opts.currency) : undefined
			)
		)
		.groupBy(movements.destinationAccountId);
}

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
				sql`not exists (select 1 from ${movements} where ${movements.accountId} = ${financialAccounts.id} or ${movements.destinationAccountId} = ${financialAccounts.id})`
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
