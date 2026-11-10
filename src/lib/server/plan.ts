import { currencyStep, type Currency } from '$lib/money';
import {
	isRecurringActive,
	limitPace,
	type PlanStatus,
	type RecurringStatus,
	type RuleState
} from '$lib/plan';
import { daysInMonth, daysLeftIn, elapsedDays } from './month';

/** Due day clamped to the month (31 → 30 in September); daysLeft is negative when overdue. */
export function recurringStatus(dayOfMonth: number, paid: boolean, ym: string, todayYmd: string) {
	const day = Math.min(dayOfMonth, daysInMonth(ym));
	const daysLeft = day - elapsedDays(ym, todayYmd);
	const status: RecurringStatus = paid
		? 'paid'
		: daysLeft < 0 || ym < todayYmd.slice(0, 7)
			? 'overdue'
			: daysLeft === 0
				? 'today'
				: 'upcoming';
	return { day, daysLeft, status };
}

/** Sum of the active rules of one type. */
export function activeTotal(rules: (RuleState & { type: string; amount: number })[], type: string) {
	return rules
		.filter((r) => r.type === type && isRecurringActive(r))
		.reduce((a, r) => a + r.amount, 0);
}

/** A plan for another month (not repeating) counts as no plan. */
export const isCurrentPlan = (plan: { month: string | null }, ym: string) =>
	plan.month === null || plan.month === ym;

/**
 * Pure: month outcomes (one currency). `total` is all spending (what Reportes calls Gastos), including
 * payments linked to an active rule; `variable` and `byCategory` leave those out (limits track variable
 * spending only).
 */
export function planSpent(
	rows: { categoryId: string | null; recurringId: string | null; amount: number }[],
	activeIds: ReadonlySet<string>
) {
	const byCategory = new Map<string, number>();
	let total = 0;
	let variable = 0;
	for (const r of rows) {
		total += r.amount;
		if (r.recurringId && activeIds.has(r.recurringId)) continue;
		variable += r.amount;
		if (r.categoryId) byCategory.set(r.categoryId, (byCategory.get(r.categoryId) ?? 0) + r.amount);
	}
	return { total, variable, byCategory };
}

export type PlanInput<L extends { amount: number; spent: number }> = {
	/** Sum of active recurring incomes. */
	recurringIncome: number;
	/** Sum of active recurring outcomes. */
	bills: number;
	/** Sum of active recurring outcomes with no payment yet this month. */
	pendingBills: number;
	savings: number;
	/** All month outcomes, including payments linked to recurring rules. */
	spent: number;
	/** Month outcomes not linked to an active recurring rule. */
	variableSpent: number;
	limits: L[];
	ym: string;
	todayYmd: string;
};

/** All inputs must be in `currency`; nothing here converts or sums across currencies. */
export function planSummary<L extends { amount: number; spent: number }>(
	p: PlanInput<L> & { currency: Currency }
) {
	const income = p.recurringIncome;
	const forSpending = income - p.bills - p.savings;
	const available = income - p.savings - p.spent - p.pendingBills;
	const days = daysInMonth(p.ym);
	const elapsed = elapsedDays(p.ym, p.todayYmd);
	// Today still counts as a day to spend in.
	const daysLeft = daysLeftIn(p.ym, p.todayYmd);
	const step = currencyStep(p.currency);
	const elapsedShare = elapsed / days;
	// Pace is variable spending against what variable spending could reach (paid bills are already settled).
	const variableBudget = available + p.variableSpent;
	const spentShare =
		variableBudget > 0 ? p.variableSpent / variableBudget : p.variableSpent > 0 ? 1 : 0;
	const status: PlanStatus = available < 0 ? 'over' : spentShare > elapsedShare ? 'warn' : 'ok';
	const limits = p.limits.map((l) => ({ ...l, ...limitPace(l.spent, l.amount, elapsedShare) }));
	return {
		income,
		bills: p.bills,
		pendingBills: p.pendingBills,
		savings: p.savings,
		forSpending,
		spent: p.spent,
		available,
		perDay: available > 0 ? Math.floor(available / daysLeft / step) * step : 0,
		daysLeft,
		elapsed,
		days,
		spentShare,
		elapsedShare,
		status,
		limits,
		unassigned: forSpending - p.limits.reduce((a, l) => a + l.amount, 0)
	};
}
