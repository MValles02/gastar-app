import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
import type { Currency } from '$lib/money';
import {
	dueLabel,
	inactiveReason,
	isRecurringActive,
	MAX_DAY_OF_MONTH,
	PLAN_STATUS_LABEL
} from '$lib/plan';
import { effectiveSavings } from '$lib/savings';
import { listAccounts } from './accounts-queries';
import { listCategories } from './categories-queries';
import { memoPerRequest } from './dashboard-queries';
import {
	currentMonth,
	HISTORY_MONTHS,
	lastFullMonths,
	localDay,
	monthLabel,
	monthRange
} from './month';
import { activeTotal, isCurrentPlan, planSpent, planSummary, recurringStatus } from './plan';
import {
	getPlan,
	listRecurring,
	monthOutcomes,
	paidRecurring,
	planLimitsByCurrency,
	recurringCandidates,
	type RecurringRule
} from './plan-queries';

/**
 * The month's plan in one currency, computed once for everything that shows it (plan, home, alerts, wizard).
 * Server-only: it carries the rules and paid ids, so it never goes to a page as is (`planView` is the client-safe part).
 * Shared by the loads of one request; never call it from a form action.
 * `summary` is always computed: without a plan it has no savings and no limits (`hasPlan` tells).
 */
export const monthPlan = (userId: string, cur: Currency) =>
	memoPerRequest(`plan:${userId}:${cur}`, () => computeMonthPlan(userId, cur));

export type MonthPlan = Awaited<ReturnType<typeof computeMonthPlan>>;

async function computeMonthPlan(userId: string, cur: Currency) {
	const now = new Date();
	const ym = currentMonth(now);
	const today = localDay(now);
	const [rules, [plan], rows, limitRows, paid] = await Promise.all([
		listRecurring(userId, cur),
		getPlan(userId, cur),
		monthOutcomes(userId, cur, monthRange(ym)),
		planLimitsByCurrency(userId, cur),
		paidRecurring(userId, monthRange(ym))
	]);
	const active = rules.filter(isRecurringActive);
	const paidIds = new Set(paid.map((p) => p.recurringId));
	const spent = planSpent(rows, new Set(active.map((r) => r.id)));
	const current = plan && isCurrentPlan(plan, ym) ? plan : null;
	const recurringIncome = activeTotal(rules, 'income');
	const summary = planSummary({
		currency: cur,
		recurringIncome,
		bills: activeTotal(rules, 'outcome'),
		pendingBills: active
			.filter((r) => r.type === 'outcome' && !paidIds.has(r.id))
			.reduce((a, r) => a + r.amount, 0),
		savings: current ? effectiveSavings(current, recurringIncome) : 0,
		spent: spent.total,
		variableSpent: spent.variable,
		limits: (current ? limitRows : []).map((l) => ({
			...l,
			spent: spent.byCategory.get(l.categoryId) ?? 0
		})),
		ym,
		todayYmd: today
	});
	return {
		ym,
		today,
		rules,
		active,
		paidIds,
		hasPlan: current !== null,
		/** Month of an ended one-month plan, if that is what the user has. */
		endedMonth: plan && !current ? plan.month : null,
		summary
	};
}

/** What the month has left before any savings, and the days left in it (the wizard and the savings drawer preview per-day figures). */
export async function savingsBaseline(userId: string, cur: Currency) {
	const { summary } = await monthPlan(userId, cur);
	return { base: summary.available + summary.savings, daysLeft: summary.daysLeft };
}

/** The plan summary for one currency; `summary` is null when there is no plan for the current month. */
export async function planView(userId: string, cur: Currency) {
	const m = await monthPlan(userId, cur);
	const summary = m.hasPlan ? m.summary : null;
	return {
		monthName: monthLabel(m.ym, false).toLowerCase(),
		summary,
		statusLabel: summary ? PLAN_STATUS_LABEL[summary.status] : '',
		endedMonthName: m.endedMonth ? monthLabel(m.endedMonth, false).toLowerCase() : null
	};
}

/** The fields every rule row on /plan shows. */
const ruleRow = (r: RecurringRule) => ({
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
export async function recurringLists(userId: string, cur: Currency) {
	const m = await monthPlan(userId, cur);
	const active = m.active.map((r) => {
		const s = recurringStatus(r.dayOfMonth, m.paidIds.has(r.id), m.ym, m.today);
		return { ...ruleRow(r), status: s.status, label: dueLabel(s, r.type) };
	});
	return {
		incomes: active.filter((r) => r.type === 'income'),
		outcomes: active.filter((r) => r.type === 'outcome'),
		inactive: m.rules
			.filter((r) => !isRecurringActive(r))
			.map((r) => ({ ...ruleRow(r), reason: inactiveReason(r)! }))
	};
}

/** An active rule's due state this month. Queries fresh, so form actions can use it. */
export async function ruleDueThisMonth(userId: string, rule: RecurringRule) {
	const now = new Date();
	const ym = currentMonth(now);
	const paid = (await paidRecurring(userId, monthRange(ym))).some((p) => p.recurringId === rule.id);
	const s = recurringStatus(rule.dayOfMonth, paid, ym, localDay(now));
	return { status: s.status, label: dueLabel(s, rule.type) };
}

/**
 * Outcomes that repeat every month and have no rule yet, as pre-filled values for a new rule. `id` is
 * the group's latest movement, an opaque handle (the /plan/recurring/new link carries it, not the data).
 */
export async function recurringSuggestions(userId: string, cur: Currency) {
	const [accounts, categories, rules, candidates] = await Promise.all([
		listAccounts(userId, { currency: cur }),
		listCategories(userId),
		listRecurring(userId, cur),
		recurringCandidates(userId, cur, lastFullMonths(currentMonth(new Date())))
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
	cur: Currency
): Promise<Map<string, number>> {
	const [rules, rows] = await Promise.all([
		listRecurring(userId, cur),
		monthOutcomes(userId, cur, lastFullMonths(currentMonth(new Date())))
	]);
	const spent = planSpent(rows, new Set(rules.filter(isRecurringActive).map((r) => r.id)));
	return new Map([...spent.byCategory].map(([id, total]) => [id, monthlyAverage(total)]));
}
