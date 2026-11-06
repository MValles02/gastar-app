import { and, count, eq, isNull, sql, type SQLWrapper } from 'drizzle-orm';
import { db } from './db';
import {
	canAccessAccount,
	canAccessCategory,
	canAccessMovement,
	canAccessPlan,
	canAccessRecurring
} from './access';
import {
	categories,
	financialAccounts,
	movements,
	recurringMovements,
	spendingPlans
} from './db/schema';

/** Runs named count queries as scalar subqueries of one statement; counts come back as numbers. */
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

/** Active accounts and categories, as the Perfil rows count them (archived ones are hidden by default). */
export async function profileCounts(userId: string) {
	const row = await counts({
		accounts: db
			.select({ n: count() })
			.from(financialAccounts)
			.where(and(canAccessAccount(userId), isNull(financialAccounts.archivedAt))),
		categories: db
			.select({ n: count() })
			.from(categories)
			.where(and(canAccessCategory(userId), isNull(categories.archivedAt)))
	});
	return row;
}

/** What "Darme de baja" erases, counted through the same access helpers (archived included). */
export async function deletionSummary(userId: string) {
	const row = await counts({
		accounts: db.select({ n: count() }).from(financialAccounts).where(canAccessAccount(userId)),
		categories: db.select({ n: count() }).from(categories).where(canAccessCategory(userId)),
		movements: db
			.select({ n: count() })
			.from(movements)
			.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
			.where(canAccessMovement(userId)),
		rules: db.select({ n: count() }).from(recurringMovements).where(canAccessRecurring(userId)),
		plans: db.select({ n: count() }).from(spendingPlans).where(canAccessPlan(userId))
	});
	return {
		accounts: row.accounts,
		movements: row.movements,
		categories: row.categories,
		hasPlan: row.plans > 0 || row.rules > 0
	};
}
