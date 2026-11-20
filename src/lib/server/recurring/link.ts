import { and, eq, gte, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { dayOfMonth } from '#lib/dates.ts';
import { roundToStep, type Currency } from '#lib/money.ts';
import type { MovementType } from '#lib/movement.ts';
import type { DbExecutor } from '../db';
import { categories, financialAccounts, movements, recurringMovements } from '../db/schema';
import { localMonth } from '../db/sql';
import { canAccessAccount, canAccessMovement, canAccessOwn } from '../access';
import { daysInMonth, localDay, monthRange } from '../month';
import { ownRule, paidRecurring } from './queries';

import { normalizeDescription } from '#lib/shared/runtime.js';

export { normalizeDescription };

/**
 * Pure: the amount a rule takes after a new linked charge (null = unchanged). The rule follows the
 * latest linked payment; an income (a salary paid in parts) never changes it.
 */
export function ruleAmountFor(
	m: { type: MovementType; amount: number },
	currency: Currency,
	rule: { amount: number },
	ym: string,
	latest: string | null
): number | null {
	const target = roundToStep(m.amount, currency);
	return m.type === 'outcome' &&
		target > 0 &&
		target !== rule.amount &&
		(latest === null || ym >= latest)
		? target
		: null;
}

/** The latest month (`YYYY-MM`) with a movement linked to the rule, optionally ignoring one movement. */
async function latestLinkedMonth(
	tx: DbExecutor,
	userId: string,
	ruleId: string,
	exceptMovementId?: string
): Promise<string | null> {
	const [{ latest }] = await tx
		.select({ latest: sql<string | null>`max(${localMonth})` })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(
				eq(movements.recurringId, ruleId),
				exceptMovementId ? ne(movements.id, exceptMovementId) : undefined,
				canAccessMovement(userId)
			)
		);
	return latest;
}

/** Locks the user's rules `ids` in id order (one order everywhere, so two relinks cannot deadlock). */
export async function lockRules(tx: DbExecutor, userId: string, ids: string[]) {
	await tx
		.select({ id: recurringMovements.id })
		.from(recurringMovements)
		.where(and(inArray(recurringMovements.id, ids), canAccessOwn(userId, recurringMovements)))
		.orderBy(recurringMovements.id)
		.for('update');
}

/**
 * Call inside the transaction that deletes or unlinks the movement `id`, before the change: undoes the
 * amount change its link made (rule amount back to `previous_amount`) when the rule still holds that
 * charge's amount and no other linked movement is as recent or more recent. Otherwise leaves the rule.
 */
export async function unlinkRevert(tx: DbExecutor, userId: string, id: string) {
	const [m] = await tx
		.select({
			recurringId: movements.recurringId,
			type: movements.type,
			amount: movements.amount,
			occurredAt: movements.occurredAt,
			currency: financialAccounts.currency
		})
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(and(eq(movements.id, id), canAccessMovement(userId)));
	if (!m?.recurringId || m.type !== 'outcome') return;
	const [rule] = await tx
		.select({
			amount: recurringMovements.amount,
			previousAmount: recurringMovements.previousAmount
		})
		.from(recurringMovements)
		.where(ownRule(userId, m.recurringId))
		.for('update');
	if (!rule || rule.previousAmount === null || rule.amount !== roundToStep(m.amount, m.currency))
		return;
	const latest = await latestLinkedMonth(tx, userId, m.recurringId, id);
	if (latest !== null && latest >= localDay(m.occurredAt).slice(0, 7)) return;
	// Another linked charge with the same amount still backs the rule's current amount.
	const others = await tx
		.select({ amount: movements.amount, currency: financialAccounts.currency })
		.from(movements)
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.where(
			and(eq(movements.recurringId, m.recurringId), ne(movements.id, id), canAccessMovement(userId))
		);
	if (others.some((o) => roundToStep(o.amount, o.currency) === rule.amount)) return;
	await tx
		.update(recurringMovements)
		.set({ amount: rule.previousAmount, previousAmount: null, updatedAt: new Date() })
		.where(ownRule(userId, m.recurringId));
}

/**
 * The rule a new income/outcome belongs to (null = none), applying `ruleAmountFor`. Call inside the
 * insert's transaction; the rule rows are locked so two concurrent inserts cannot both link the same
 * rule in a month. `explicitRuleId` skips description matching.
 */
export async function linkRuleFor(
	tx: DbExecutor,
	userId: string,
	m: {
		type: MovementType;
		accountId: string;
		occurredAt: Date;
		description: string;
		amount: number;
	},
	explicitRuleId: string | null = null
): Promise<string | null> {
	if (m.type === 'transfer') return null;
	const local = localDay(m.occurredAt);
	const ym = local.slice(0, 7);
	const day = dayOfMonth(local);
	const [account] = await tx
		.select({ currency: financialAccounts.currency })
		.from(financialAccounts)
		.where(and(eq(financialAccounts.id, m.accountId), canAccessAccount(userId)));
	if (!account) return null;

	const candidates = await tx
		.select({
			id: recurringMovements.id,
			description: recurringMovements.description,
			dayOfMonth: recurringMovements.dayOfMonth,
			amount: recurringMovements.amount,
			endsMonth: recurringMovements.endsMonth
		})
		.from(recurringMovements)
		.innerJoin(
			financialAccounts,
			and(eq(recurringMovements.accountId, financialAccounts.id), canAccessAccount(userId))
		)
		.innerJoin(
			categories,
			and(eq(recurringMovements.categoryId, categories.id), canAccessOwn(userId, categories))
		)
		.where(
			and(
				canAccessOwn(userId, recurringMovements),
				eq(recurringMovements.type, m.type),
				// An installment rule (ends_month set) links only explicitly, and not past its last month.
				or(isNull(recurringMovements.endsMonth), gte(recurringMovements.endsMonth, ym)),
				explicitRuleId ? undefined : isNull(recurringMovements.endsMonth),
				eq(financialAccounts.currency, account.currency),
				isNull(recurringMovements.archivedAt),
				isNull(financialAccounts.archivedAt),
				isNull(categories.archivedAt),
				explicitRuleId ? eq(recurringMovements.id, explicitRuleId) : undefined
			)
		)
		.for('update', { of: recurringMovements });

	const taken = new Set(
		(await paidRecurring(userId, monthRange(ym), tx)).map((p) => p.recurringId)
	);
	const wanted = normalizeDescription(m.description);
	const dist = (r: { dayOfMonth: number }) =>
		Math.abs(Math.min(r.dayOfMonth, daysInMonth(ym)) - day);
	const rule = candidates
		.filter((r) => !taken.has(r.id))
		.filter((r) => explicitRuleId || normalizeDescription(r.description) === wanted)
		.sort((a, b) => dist(a) - dist(b) || a.dayOfMonth - b.dayOfMonth || (a.id < b.id ? -1 : 1))[0];
	if (!rule) return null;

	// An installment rule (endsMonth set) keeps its total ÷ cuotas amount: it never follows linked charges.
	const amount =
		rule.endsMonth === null
			? ruleAmountFor(m, account.currency, rule, ym, await latestLinkedMonth(tx, userId, rule.id))
			: null;
	if (amount !== null)
		await tx
			.update(recurringMovements)
			.set({ amount, previousAmount: rule.amount, updatedAt: new Date() })
			.where(ownRule(userId, rule.id));
	return rule.id;
}
