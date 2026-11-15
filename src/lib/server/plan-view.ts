import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import { DESCRIPTION_MAX_LENGTH } from '$lib/fields';
import { CURRENCIES, convertAmount, roundToStep, type Currency } from '$lib/money';
import {
	dueLabel,
	inactiveReason,
	effectiveSavings,
	isRecurringActive,
	MAX_DAY_OF_MONTH,
	PLAN_CURRENCY,
	PLAN_STATUS_LABEL
} from '$lib/plan';
import { listAccounts } from './accounts-queries';
import { listCategories } from './categories-queries';
import { memoPerRequest } from './request-memo';
import {
	currentMonth,
	HISTORY_MONTHS,
	lastFullMonths,
	localDay,
	monthLabel,
	monthRange
} from './month';
import {
	activeTotal,
	isCurrentPlan,
	planSpent,
	planSummary,
	recurringStatus,
	toPlan
} from './plan';
import {
	currentPlanLimits,
	getPlan,
	listRecurring,
	monthOutcomes,
	paidRecurring,
	planRate,
	recurringCandidates,
	type RecurringRule
} from './plan-queries';

/**
 * The month's plan (always in pesos, USD items converted at the plan rate), computed once for everything
 * that shows it (plan, home, alerts, wizard).
 * Server-only: it carries the rules and paid ids, so it never goes to a page as is (`planView` is the client-safe part).
 * Shared by the loads of one request; never call it from a form action.
 * `summary` is always computed: without a plan it has no savings and no limits (`hasPlan` tells).
 */
export const monthPlan = memoPerRequest('plan', computeMonthPlan);

export type MonthPlan = Awaited<ReturnType<typeof computeMonthPlan>>;

async function computeMonthPlan(userId: string) {
	const now = new Date();
	const ym = currentMonth(now);
	const today = localDay(now);
	const [rules, [plan], rows, limitRows, paid, rate] = await Promise.all([
		listRecurring(userId),
		getPlan(userId),
		monthOutcomes(userId, monthRange(ym)),
		currentPlanLimits(userId),
		paidRecurring(userId, monthRange(ym)),
		planRate(userId)
	]);
	const active = rules.filter(isRecurringActive);
	const activeIds = new Set(active.map((r) => r.id));
	const paidIds = new Set(paid.map((p) => p.recurringId));
	const current = plan && isCurrentPlan(plan, ym) ? plan : null;

	// Each figure is summed per currency first and converted once (null = USD without a rate, left out).
	const perCurrency = CURRENCIES.map((cur) => {
		const own = active.filter((r) => r.currency === cur);
		return {
			cur,
			income: activeTotal(own, 'income'),
			bills: activeTotal(own, 'outcome'),
			pendingBills: own
				.filter((r) => r.type === 'outcome' && !paidIds.has(r.id))
				.reduce((a, r) => a + r.amount, 0),
			spent: planSpent(
				rows.filter((r) => r.currency === cur),
				activeIds
			)
		};
	});
	const toPesos = (pick: (p: (typeof perCurrency)[number]) => number) =>
		perCurrency.reduce((a, p) => a + (toPlan(pick(p), p.cur, rate.value) ?? 0), 0);
	const recurringIncome = toPesos((p) => p.income);

	// A limit's spending: its own currency plus the other one converted into it (left out without a rate).
	const limits = (current ? limitRows : []).map((l) => {
		let spent = 0;
		for (const p of perCurrency) {
			const x = p.spent.byCategory.get(l.categoryId) ?? 0;
			const converted =
				p.cur === l.currency
					? x
					: rate.value === null
						? null
						: convertAmount(x, rate.value, p.cur, l.currency);
			spent += converted ?? 0;
		}
		return { ...l, spent };
	});

	const summary = planSummary({
		recurringIncome,
		bills: toPesos((p) => p.bills),
		pendingBills: toPesos((p) => p.pendingBills),
		savings: current ? effectiveSavings(current, recurringIncome) : 0,
		spent: toPesos((p) => p.spent.total),
		variableSpent: toPesos((p) => p.spent.variable),
		limits,
		ym,
		todayYmd: today
	});
	const usdItems =
		active.some((r) => r.currency === 'USD') ||
		rows.some((r) => r.currency === 'USD') ||
		limits.some((l) => l.currency === 'USD');
	return {
		ym,
		rules,
		active,
		paidIds,
		rate,
		/** USD items exist but there is no rate to convert them: they stay out of the pesos totals. */
		missingRate: rate.value === null && usdItems,
		hasPlan: current !== null,
		/** Month of an ended one-month plan, if that is what the user has. */
		endedMonth: plan && !current ? plan.month : null,
		summary
	};
}

/** What the month has left before any savings, and the days left in it (the wizard and the savings drawer preview per-day figures). */
export async function savingsBaseline(userId: string) {
	const { summary } = await monthPlan(userId);
	return { base: summary.available + summary.savings, daysLeft: summary.daysLeft };
}

/** The plan summary; `summary` is null when there is no plan for the current month. */
export async function planView(userId: string) {
	const m = await monthPlan(userId);
	const summary = m.hasPlan ? m.summary : null;
	return {
		monthName: monthLabel(m.ym, false).toLowerCase(),
		summary,
		statusLabel: summary ? PLAN_STATUS_LABEL[summary.status] : '',
		endedMonthName: m.endedMonth ? monthLabel(m.endedMonth, false).toLowerCase() : null,
		missingRate: m.missingRate,
		rate: {
			value: m.rate.value,
			manual: m.rate.manual,
			/** "dd/mm" of the transfer the rate comes from. */
			date: m.rate.day ? `${m.rate.day.slice(8, 10)}/${m.rate.day.slice(5, 7)}` : null
		}
	};
}

/** The fields every rule row on /plan shows; `converted` is the amount in plan pesos for USD rules (null: ARS rule or no rate). */
const ruleRow = (r: RecurringRule, rate: number | null) => ({
	id: r.id,
	type: r.type,
	description: r.description,
	amount: r.amount,
	currency: r.currency,
	converted: r.currency === PLAN_CURRENCY ? null : toPlan(r.amount, r.currency, rate),
	accountName: r.accountName,
	day: r.dayOfMonth,
	categoryIcon: toCategoryIconKey(r.categoryIcon),
	categoryColor: toSwatchKey(r.categoryColor)
});

/** Recurring rules as /plan lists them: active incomes and outcomes (with due status) and inactive ones. */
export async function recurringLists(userId: string) {
	const m = await monthPlan(userId);
	const active = m.active.map((r) => {
		const s = recurringStatus(r.dayOfMonth, m.paidIds.has(r.id), m.ym);
		return { ...ruleRow(r, m.rate.value), status: s.status, label: dueLabel(s, r.type) };
	});
	return {
		incomes: active.filter((r) => r.type === 'income'),
		outcomes: active.filter((r) => r.type === 'outcome'),
		inactive: m.rules
			.filter((r) => !isRecurringActive(r))
			.map((r) => ({ ...ruleRow(r, m.rate.value), reason: inactiveReason(r)! }))
	};
}

/** An active rule's due state this month. Queries fresh, so form actions can use it. */
export async function ruleDueThisMonth(userId: string, rule: RecurringRule) {
	const now = new Date();
	const ym = currentMonth(now);
	const paid = (await paidRecurring(userId, monthRange(ym))).some((p) => p.recurringId === rule.id);
	const s = recurringStatus(rule.dayOfMonth, paid, ym);
	return { status: s.status, label: dueLabel(s, rule.type) };
}

/** Active rules of one type and currency, as picker items (linking a movement to a fixed payment). */
export async function activeRuleItems(userId: string, cur: Currency, type: 'income' | 'outcome') {
	const rules = await listRecurring(userId, cur);
	return rules
		.filter((r) => isRecurringActive(r) && r.type === type)
		.map((r) => ({
			id: r.id,
			name: r.description,
			icon: toCategoryIconKey(r.categoryIcon) ?? ('categories' as const),
			color: toSwatchKey(r.categoryColor)
		}));
}

/**
 * Outcomes that repeat every month and have no rule yet, as pre-filled values for a new rule. `id` is
 * the group's latest movement, an opaque handle (the /plan/recurring/new link carries it, not the data).
 */
export async function recurringSuggestions(userId: string) {
	const [accounts, categories, rules, candidates] = await Promise.all([
		listAccounts(userId),
		listCategories(userId),
		listRecurring(userId),
		recurringCandidates(userId, lastFullMonths(currentMonth(new Date())))
	]);
	// Inactive rules count too: a deactivated rule is not suggested again.
	const ruleNames = new Set(rules.map((r) => `${r.type}|${r.description.trim().toLowerCase()}`));
	return candidates
		.map((c) => ({ ...c, description: c.description.slice(0, DESCRIPTION_MAX_LENGTH) }))
		.filter((c) => c.categoryId && !ruleNames.has(`outcome|${c.description.trim().toLowerCase()}`))
		.map((c) => ({
			id: c.id,
			description: c.description,
			currency: c.currency,
			// Averages are not always whole; ARS rules are whole pesos.
			amount: roundToStep(c.amount, c.currency),
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

/** Suggested limit per category and currency: monthly average of spending outside active rules over the last full months. */
export async function limitSuggestions(
	userId: string
): Promise<Map<string, Record<Currency, number>>> {
	const [rules, rows] = await Promise.all([
		listRecurring(userId),
		monthOutcomes(userId, lastFullMonths(currentMonth(new Date())))
	]);
	const activeIds = new Set(rules.filter(isRecurringActive).map((r) => r.id));
	const out = new Map<string, Record<Currency, number>>();
	for (const cur of CURRENCIES) {
		const spent = planSpent(
			rows.filter((r) => r.currency === cur),
			activeIds
		);
		for (const [id, total] of spent.byCategory) {
			const entry = out.get(id) ?? { ARS: 0, USD: 0 };
			entry[cur] = monthlyAverage(total);
			out.set(id, entry);
		}
	}
	return out;
}
