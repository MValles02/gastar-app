import type { Currency } from './dashboard';
import { currentMonth, localDay, monthLabel, monthRange } from './month';
import { isRecurringActive, PLAN_STATUS_LABEL, planSpent, planSummary } from './plan';
import { getPlan, listRecurring, monthOutcomes, planLimits } from './plan-queries';

/** The plan summary for one currency as of `now`; `summary` is null when there is no plan for the current month. */
export async function planView(userId: string, cur: Currency, now = new Date()) {
	const ym = currentMonth(now);
	const [rules, [plan], rows] = await Promise.all([
		listRecurring(userId, cur),
		getPlan(userId, cur),
		monthOutcomes(userId, cur, monthRange(ym))
	]);

	const active = rules.filter(isRecurringActive);
	const sumRules = (type: 'income' | 'outcome') =>
		active.filter((r) => r.type === type).reduce((a, r) => a + r.amount, 0);
	const spent = planSpent(rows, new Set(active.map((r) => r.id)));

	// A plan for another month (not repeating) counts as no plan.
	const current = plan && (plan.month === null || plan.month === ym) ? plan : null;
	const limits = current ? await planLimits(userId, current.id) : [];
	const summary = current
		? planSummary({
				currency: cur,
				recurringIncome: sumRules('income'),
				extraIncome: current.extraIncome,
				bills: sumRules('outcome'),
				savings: current.savings,
				spent: spent.total,
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
		summary,
		statusLabel: summary ? PLAN_STATUS_LABEL[summary.status] : '',
		/** Month name of an ended one-month plan, if that is what the user has. */
		endedMonthName:
			plan && !current && plan.month ? monthLabel(plan.month, false).toLowerCase() : null
	};
}
