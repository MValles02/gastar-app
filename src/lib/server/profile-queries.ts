import { and, count, eq, isNull } from 'drizzle-orm';
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

/** Active accounts and categories, as the Perfil rows count them (archived ones are hidden by default). */
export async function profileCounts(userId: string) {
	const [[accounts], [cats]] = await Promise.all([
		db
			.select({ n: count() })
			.from(financialAccounts)
			.where(and(canAccessAccount(userId), isNull(financialAccounts.archivedAt))),
		db
			.select({ n: count() })
			.from(categories)
			.where(and(canAccessCategory(userId), isNull(categories.archivedAt)))
	]);
	return { accounts: accounts.n, categories: cats.n };
}

/** What "Darme de baja" erases, counted through the same access helpers (archived included). */
export async function deletionSummary(userId: string) {
	const [[accounts], [cats], [moves], [rules], [plans]] = await Promise.all([
		db.select({ n: count() }).from(financialAccounts).where(canAccessAccount(userId)),
		db.select({ n: count() }).from(categories).where(canAccessCategory(userId)),
		db
			.select({ n: count() })
			.from(movements)
			.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
			.where(canAccessMovement(userId)),
		db.select({ n: count() }).from(recurringMovements).where(canAccessRecurring(userId)),
		db.select({ n: count() }).from(spendingPlans).where(canAccessPlan(userId))
	]);
	return {
		accounts: accounts.n,
		movements: moves.n,
		categories: cats.n,
		hasPlan: plans.n > 0 || rules.n > 0
	};
}
