import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import type { Currency } from '$lib/money';
import { currentMonth, localDay, monthLabel, monthRange } from './month';
import {
	dueLabel,
	HISTORY_MONTHS,
	inactiveReason,
	isRecurringActive,
	lastFullMonths,
	MAX_DAY_OF_MONTH,
	PLAN_STATUS_LABEL,
	planSpent,
	planSummary,
	recurringStatus
} from './plan';
import { effectiveSavings } from '$lib/savings';
import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
import { listAccounts } from './accounts-queries';
import { listCategories } from './categories-queries';
import {
	getPlan,
	listRecurring,
	monthOutcomes,
	paidRecurring,
	planLimitsByCurrency,
	recurringCandidates
} from './plan-queries';

/** The plan summary for one currency as of `now`; `summary` is null when there is no plan for the current month. */
export async function planView(userId: string, cur: Currency, now = new Date()) {
	const ym = currentMonth(now);
	const [rules, [plan], rows, limitRows] = await Promise.all([
		listRecurring(userId, cur),
		getPlan(userId, cur),
		monthOutcomes(userId, cur, monthRange(ym)),
		planLimitsByCurrency(userId, cur)
	]);

	const active = rules.filter(isRecurringActive);
	const sumRules = (type: 'income' | 'outcome') =>
		active.filter((r) => r.type === type).reduce((a, r) => a + r.amount, 0);
	const spent = planSpent(rows, new Set(active.map((r) => r.id)));

	// A plan for another month (not repeating) counts as no plan.
	const current = plan && (plan.month === null || plan.month === ym) ? plan : null;
	const limits = current ? limitRows : [];
	const recurringIncome = sumRules('income');
	const summary = current
		? planSummary({
				currency: cur,
				recurringIncome,
				bills: sumRules('outcome'),
				pendingBills: active
					.filter((r) => r.type === 'outcome' && !spent.paidIds.has(r.id))
					.reduce((a, r) => a + r.amount, 0),
				savings: effectiveSavings(current, recurringIncome),
				spent: spent.total,
				variableSpent: spent.variable,
				limits: limits.map((l) => ({ ...l, spent: spent.byCategory.get(l.categoryId) ?? 0 })),
				ym,
				todayYmd: localDay(now)
			})
		: null;

	return {
		/** Server-only: all rules and the active subset, so callers need not query them again; never send to the client. */
		rules,
		active,
		monthName: monthLabel(ym, false).toLowerCase(),
		// planSummary's limits drop the category color/icon; put them back for the limit rows.
		summary: summary && {
			...summary,
			limits: summary.limits.map((l) => {
				const c = limits.find((x) => x.categoryId === l.categoryId)!;
				return { ...l, color: c.color, icon: c.icon };
			})
		},
		statusLabel: summary ? PLAN_STATUS_LABEL[summary.status] : '',
		/** Month name of an ended one-month plan, if that is what the user has. */
		endedMonthName:
			plan && !current && plan.month ? monthLabel(plan.month, false).toLowerCase() : null
	};
}

/** The fields every rule row on /plan shows. */
const ruleRow = (r: Awaited<ReturnType<typeof listRecurring>>[number]) => ({
	id: r.id,
	type: r.type,
	description: r.description,
	amount: r.amount,
	accountName: r.accountName,
	day: r.dayOfMonth,
	categoryIcon: toCategoryIconKey(r.categoryIcon),
	categoryColor: toSwatchKey(r.categoryColor)
});

/** Recurring rules of one currency as /plan lists them: active incomes and outcomes (with due status) and inactive ones. */
export async function recurringLists(userId: string, cur: Currency, now = new Date()) {
	const ym = currentMonth(now);
	const today = localDay(now);
	const [rules, paid] = await Promise.all([
		listRecurring(userId, cur),
		paidRecurring(userId, monthRange(ym))
	]);
	const paidIds = new Set(paid.map((p) => p.recurringId));
	const active = rules.filter(isRecurringActive).map((r) => {
		const s = recurringStatus(r.dayOfMonth, paidIds.has(r.id), ym, today);
		return { ...ruleRow(r), status: s.status, label: dueLabel(s, r.type) };
	});
	return {
		incomes: active.filter((r) => r.type === 'income'),
		outcomes: active.filter((r) => r.type === 'outcome'),
		inactive: rules
			.filter((r) => !isRecurringActive(r))
			.map((r) => ({ ...ruleRow(r), reason: inactiveReason(r)! }))
	};
}

/**
 * Outcomes that repeat every month and have no rule yet, as pre-filled values for a new rule. `id` is
 * the group's latest movement, an opaque handle (the /plan/recurring/new link carries it, not the data).
 */
export async function recurringSuggestions(userId: string, cur: Currency, now = new Date()) {
	const [accounts, categories, rules, candidates] = await Promise.all([
		listAccounts(userId, { currency: cur }),
		listCategories(userId),
		listRecurring(userId, cur),
		recurringCandidates(userId, cur, lastFullMonths(currentMonth(now)))
	]);
	// Inactive rules count too: a deactivated rule is not suggested again.
	const ruleNames = new Set(rules.map((r) => `${r.type}|${r.description.trim().toLowerCase()}`));
	return candidates
		.map((c) => ({ ...c, description: c.description.slice(0, DESCRIPTION_MAX_LENGTH) }))
		.filter((c) => c.categoryId && !ruleNames.has(`outcome|${c.description.trim().toLowerCase()}`))
		.map((c) => ({
			id: c.id,
			description: c.description,
			// Averages are not always whole; ARS rules are whole pesos.
			amount: cur === 'ARS' ? Math.floor((c.amount + 50) / 100) * 100 : c.amount,
			dayOfMonth: Math.min(Math.max(c.dayOfMonth, 1), MAX_DAY_OF_MONTH),
			accountId: c.accountId,
			categoryId: c.categoryId!,
			accountName: accounts.find((a) => a.id === c.accountId)?.name ?? '',
			categoryKind: categories.find((k) => k.id === c.categoryId)?.kind,
			categoryName: categories.find((k) => k.id === c.categoryId)?.name ?? ''
		}))
		.filter((c) => c.amount > 0 && c.accountName && c.categoryName)
		.filter((c) => !c.categoryKind || c.categoryKind === 'outcome')
		.sort((a, b) => a.description.localeCompare(b.description));
}

/** Monthly average of a `HISTORY_MONTHS` total, rounded half up to whole units (integer math). */
const monthlyAverage = (total: number) =>
	Math.floor((total + 50 * HISTORY_MONTHS) / (100 * HISTORY_MONTHS)) * 100;

/** Suggested limit per category: monthly average of spending outside active rules over the last full months. */
export async function limitSuggestions(
	userId: string,
	cur: Currency,
	now = new Date()
): Promise<Map<string, number>> {
	const [rules, rows] = await Promise.all([
		listRecurring(userId, cur),
		monthOutcomes(userId, cur, lastFullMonths(currentMonth(now)))
	]);
	const spent = planSpent(rows, new Set(rules.filter(isRecurringActive).map((r) => r.id)));
	return new Map([...spent.byCategory].map(([id, total]) => [id, monthlyAverage(total)]));
}
