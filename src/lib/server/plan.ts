import { convertAmount, currencyStep, type Currency } from '$lib/money';
import {
	isRecurringActive,
	PLAN_CURRENCY,
	limitPace,
	type PlanStatus,
	type RecurringStatus,
	type RuleState
} from '$lib/plan';
import { daysInMonth, daysLeftIn, elapsedDays } from './month';

/** `amount` in plan pesos; null for a USD amount when there is no rate. */
export function toPlan(amount: number, cur: Currency, rate: number | null): number | null {
	if (cur === PLAN_CURRENCY) return amount;
	return rate === null ? null : convertAmount(amount, rate, cur, PLAN_CURRENCY);
}

/** Descriptions match ignoring case, accents and surrounding spaces (rule vs movement). */
export const normalizeDescription = (s: string) =>
	s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/** Due day clamped to the month (31 → 30 in September). */
export function recurringStatus(dayOfMonth: number, paid: boolean, ym: string) {
	const status: RecurringStatus = paid ? 'paid' : 'pending';
	return { day: Math.min(dayOfMonth, daysInMonth(ym)), status };
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

export type PlanInput<L extends { amount: number; spent: number; currency: Currency }> = {
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

/** Totals are in plan pesos; each limit stays in its own currency (`amount` and `spent`). */
export function planSummary<L extends { amount: number; spent: number; currency: Currency }>(
	p: PlanInput<L>
) {
	const income = p.recurringIncome;
	const forSpending = income - p.bills - p.savings;
	const available = income - p.savings - p.spent - p.pendingBills;
	const days = daysInMonth(p.ym);
	const elapsed = elapsedDays(p.ym, p.todayYmd);
	// Today still counts as a day to spend in.
	const daysLeft = daysLeftIn(p.ym, p.todayYmd);
	const step = currencyStep(PLAN_CURRENCY);
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
		limits
	};
}
