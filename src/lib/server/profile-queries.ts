import { and, count, eq, isNull, sql, type SQLWrapper } from 'drizzle-orm';
import { db } from './db';
import { canAccessAccount, canAccessMovement, canAccessOwn } from './access';
import { activeCategory } from './categories/queries';
import {
	categories,
	financialAccounts,
	movements,
	recurringMovements,
	spendingPlans
} from './db/schema';

const counts = async <K extends string>(q: Record<K, SQLWrapper>) => {
	const parts = Object.entries<SQLWrapper>(q).map(([k, v]) => sql`${v} as ${sql.identifier(k)}`);
	const [row] = await db.execute<Record<K, string | number>>(
		sql`select ${sql.join(parts, sql`, `)}`
	);
	return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v)])) as Record<
		K,
		number
	>;
};

export async function profileCounts(userId: string) {
	const row = await counts({
		accounts: db
			.select({ n: count() })
			.from(financialAccounts)
			.where(and(canAccessAccount(userId), isNull(financialAccounts.archivedAt))),
		categories: db
			.select({ n: count() })
			.from(categories)
			.where(and(canAccessOwn(userId, categories), activeCategory))
	});
	return row;
}

export async function deletionSummary(userId: string) {
	const row = await counts({
		accounts: db.select({ n: count() }).from(financialAccounts).where(canAccessAccount(userId)),
		categories: db.select({ n: count() }).from(categories).where(canAccessOwn(userId, categories)),
		movements: db
			.select({ n: count() })
			.from(movements)
			.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
			.where(canAccessMovement(userId)),
		rules: db
			.select({ n: count() })
			.from(recurringMovements)
			.where(canAccessOwn(userId, recurringMovements)),
		plans: db.select({ n: count() }).from(spendingPlans).where(canAccessOwn(userId, spendingPlans))
	});
	return {
		accounts: row.accounts,
		movements: row.movements,
		categories: row.categories,
		hasPlan: row.plans > 0 || row.rules > 0
	};
}
