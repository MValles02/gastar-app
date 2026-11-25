import { toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
import { DESCRIPTION_MAX_LENGTH } from '#lib/fields.ts';
import {
	CURRENCIES,
	formatAmountInput,
	formatMoney,
	roundToStep,
	type Currency
} from '#lib/money.ts';
import {
	dueInLabel,
	dueLabel,
	inactiveReason,
	effectiveSavings,
	isRecurringActive,
	MAX_DAY_OF_MONTH,
	PLAN_CURRENCY,
	PLAN_STATUS_LABEL
} from '#lib/plan.ts';
import { listAccounts } from '../accounts/queries';
import { listCategories } from '../categories/queries';
import { memoPerRequest } from '../request-memo';
import {
	currentMonth,
	HISTORY_MONTHS,
	lastFullMonths,
	localDay,
	monthLabel,
	monthRange
} from '../month';
import {
	listRecurring,
	paidRecurring,
	recurringCandidates,
	type RecurringRule
} from '../recurring/queries';
import {
	activeTotal,
	convertTo,
	isCurrentPlan,
	planSpent,
	planSummary,
	recurringIncomeInPesos,
	recurringStatus,
	toPlanCurrency
} from './summary';
import {
	currentPlanLimits,
	getPlan,
	monthOutcomes,
	monthOutcomesByDay,
	planLimits,
	planRate
} from './queries';
import { requireLimit, requirePlan } from './guard';

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
		perCurrency.reduce((a, p) => a + (toPlanCurrency(pick(p), p.cur, rate.value) ?? 0), 0);
	const recurringIncome = recurringIncomeInPesos(rules, rate.value);

	// A limit's spending: its own currency plus the other one converted into it (left out without a rate).
	const limits = (current ? limitRows : []).map((l) => {
		let spent = 0;
		for (const p of perCurrency) {
			const x = p.spent.byCategory.get(l.categoryId) ?? 0;
			spent += convertTo(x, p.cur, l.currency, rate.value) ?? 0;
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

/**
 * Variable spending (outside active rules, plan pesos) by day of the month against an even pace of the
 * month's budget; null without a plan or a budget. `points[d]` is the running total at the end of day d.
 */
export async function planPace(userId: string) {
	const m = await monthPlan(userId);
	if (!m.hasPlan) return null;
	const s = m.summary;
	const budget = s.available + s.variableSpent;
	if (budget <= 0) return null;

	const activeIds = new Set(m.active.map((r) => r.id));
	const rows = await monthOutcomesByDay(userId, monthRange(m.ym));
	// Per-currency running totals, each converted once, so the last point equals `variableSpent`.
	const daily = new Map<Currency, number[]>(
		CURRENCIES.map((cur) => [cur, new Array<number>(s.elapsed + 1).fill(0)])
	);
	for (const r of rows) {
		if (r.recurringId && activeIds.has(r.recurringId)) continue;
		const d = Math.min(Number(r.day.slice(8)), s.elapsed);
		daily.get(r.currency)![d] += r.amount;
	}
	const points = Array.from({ length: s.elapsed + 1 }, () => 0);
	for (const [cur, perDay] of daily) {
		let run = 0;
		perDay.forEach((amount, d) => {
			run += amount;
			points[d] += toPlanCurrency(run, cur, m.rate.value) ?? 0;
		});
	}

	const idealToday = Math.round((budget * s.elapsed) / s.days);
	const diff = idealToday - points[s.elapsed];
	const tag =
		diff > 0
			? { label: `${formatMoney(diff, PLAN_CURRENCY)} por debajo del ritmo`, tone: 'ok' as const }
			: diff < 0
				? {
						label: `${formatMoney(-diff, PLAN_CURRENCY)} por encima del ritmo`,
						tone: s.available < 0 ? ('bad' as const) : ('warning' as const)
					}
				: { label: 'En el ritmo', tone: 'ok' as const };
	return { days: s.days, today: s.elapsed, budget, points, idealToday, tag };
}

/** This month's fixed payments in `currency` (never converted): paid so far and the unpaid ones still due. */
export async function upcomingBills(userId: string, currency: Currency) {
	const m = await monthPlan(userId);
	const rules = m.active.filter((r) => r.type === 'outcome' && r.currency === currency);
	if (rules.length === 0) return null;
	const today = m.summary.elapsed;
	const unpaid = rules
		.filter((r) => !m.paidIds.has(r.id))
		.map((r) => ({ r, day: recurringStatus(r.dayOfMonth, false, m.ym).day }))
		.filter(({ day }) => day >= today)
		.sort((a, b) => a.day - b.day || a.r.description.localeCompare(b.r.description));
	return {
		total: rules.reduce((a, r) => a + r.amount, 0),
		paid: rules.filter((r) => m.paidIds.has(r.id)).reduce((a, r) => a + r.amount, 0),
		allPaid: rules.every((r) => m.paidIds.has(r.id)),
		items: unpaid.map(({ r, day }) => ({
			id: r.id,
			description: r.description,
			amount: r.amount,
			currency: r.currency,
			label: dueInLabel(day - today),
			soon: day - today <= 1
		}))
	};
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
	converted: r.currency === PLAN_CURRENCY ? null : toPlanCurrency(r.amount, r.currency, rate),
	accountName: r.accountName,
	day: r.dayOfMonth,
	categoryIcon: toCategoryIconKey(r.categoryIcon),
	categoryColor: toSwatchKey(r.categoryColor)
});

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

export async function limitCandidates(userId: string, planId: string | null) {
	const [categories, limits] = await Promise.all([
		listCategories(userId),
		planId ? planLimits(userId, planId) : []
	]);
	const limited = new Set(limits.map((l) => l.categoryId));
	return categories.filter((c) => c.kind !== 'income' && !limited.has(c.id));
}

/** Limit candidates with their suggested monthly limit per currency. */
export async function limitOptions(userId: string, planId: string | null) {
	const [candidates, suggestions] = await Promise.all([
		limitCandidates(userId, planId),
		limitSuggestions(userId)
	]);
	return candidates.map((c) => ({ ...c, suggested: suggestions.get(c.id) ?? { ARS: 0, USD: 0 } }));
}

export async function limitView(userId: string, categoryId: string) {
	const plan = await requirePlan(userId);
	const limit = await requireLimit(userId, plan.id, categoryId);
	const [suggestions, view] = await Promise.all([limitSuggestions(userId), planView(userId)]);
	return {
		progress: view.summary?.limits.find((l) => l.categoryId === limit.categoryId),
		elapsedShare: view.summary?.elapsedShare ?? 0,
		currency: limit.currency,
		category: {
			id: limit.categoryId,
			name: limit.name,
			icon: toCategoryIconKey(limit.icon) ?? ('categories' as const),
			color: toSwatchKey(limit.color)
		},
		amount: formatAmountInput(limit.amount, limit.currency),
		suggested: suggestions.get(limit.categoryId)?.[limit.currency] ?? 0
	};
}
