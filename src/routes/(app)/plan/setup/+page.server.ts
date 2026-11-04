import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseStep } from '$lib/plan-wizard';
import type { Currency } from '$lib/money';
import { listAccounts } from '$lib/server/accounts-queries';
import { listCategories } from '$lib/server/categories-queries';
import { preferredCurrency } from '$lib/server/currency-pref';
import { currentMonth, localDay, monthRange } from '$lib/server/month';
import { isRecurringActive, parseSavingsForm, planSpent, planSummary } from '$lib/server/plan';
import {
	currentPlan,
	listRecurring,
	monthOutcomes,
	planIncome,
	planLimits,
	updatePlan,
	upsertLimits,
	upsertPlan
} from '$lib/server/plan-queries';
import {
	limitSuggestions,
	planView,
	recurringLists,
	recurringSuggestions
} from '$lib/server/plan-view';

/** Suggested limits the wizard can apply: active non-income categories with no limit yet and a suggestion above zero. */
async function applicableSuggestions(userId: string, cur: Currency, planId: string | null) {
	const [categories, suggestions, limits] = await Promise.all([
		listCategories(userId),
		limitSuggestions(userId, cur),
		planId ? planLimits(userId, planId) : []
	]);
	const limited = new Set(limits.map((l) => l.categoryId));
	return categories
		.filter((c) => c.kind !== 'income' && !limited.has(c.id))
		.map((c) => ({ categoryId: c.id, amount: suggestions.get(c.id) ?? 0 }))
		.filter((l) => l.amount > 0);
}

/**
 * What the month has left before any savings (`base`) and the days left in it, computed with
 * `planSummary` at savings = 0 so the wizard's per-day preview matches `planView` exactly.
 */
async function savingsBaseline(userId: string, cur: Currency) {
	const now = new Date();
	const ym = currentMonth(now);
	const [rules, rows] = await Promise.all([
		listRecurring(userId, cur),
		monthOutcomes(userId, cur, monthRange(ym))
	]);
	const active = rules.filter(isRecurringActive);
	const spent = planSpent(rows, new Set(active.map((r) => r.id)));
	const sum = (type: 'income' | 'outcome') =>
		active.filter((r) => r.type === type).reduce((a, r) => a + r.amount, 0);
	const s = planSummary({
		currency: cur,
		recurringIncome: sum('income'),
		bills: sum('outcome'),
		pendingBills: active
			.filter((r) => r.type === 'outcome' && !spent.paidIds.has(r.id))
			.reduce((a, r) => a + r.amount, 0),
		savings: 0,
		spent: spent.total,
		variableSpent: spent.variable,
		limits: [],
		ym,
		todayYmd: localDay(now)
	});
	return { base: s.available, daysLeft: s.daysLeft };
}

type Summary = NonNullable<Awaited<ReturnType<typeof planView>>['summary']>;

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const currency = preferredCurrency(cookies);
	const param = parseStep(url.searchParams.get('step'));
	const step = param ?? 1;

	const [accounts, plan] = await Promise.all([
		listAccounts(userId, { currency }),
		currentPlan(userId, currency)
	]);
	if (accounts.length === 0) redirect(303, '/plan');
	if (!param && plan) redirect(303, '/plan');
	if (step >= 4 && !plan) redirect(303, '/plan/setup?step=3');

	// One shape for every step (SvelteKit turns a union of returns into optional fields).
	const none = {
		active: [] as Awaited<ReturnType<typeof recurringLists>>['incomes'],
		inactive: [] as Awaited<ReturnType<typeof recurringLists>>['inactive'],
		income: 0,
		/** Step 3: what the month has left before savings, and the days left. */
		savingsBase: { base: 0, daysLeft: 1 },
		savings: { savings: plan?.savings ?? 0, savingsPercent: plan?.savingsPercent ?? null },
		suggestions: [] as Awaited<ReturnType<typeof recurringSuggestions>>,
		limits: [] as Summary['limits'],
		canSuggest: false,
		summary: null as Summary | null,
		monthName: '',
		repeats: true
	};
	const base = { ...none, currency, step };
	if (step <= 2) {
		const [lists, suggestions] = await Promise.all([
			recurringLists(userId, currency),
			step === 2 ? recurringSuggestions(userId, currency) : []
		]);
		const type = step === 1 ? 'income' : 'outcome';
		return {
			...base,
			active: step === 1 ? lists.incomes : lists.outcomes,
			inactive: lists.inactive.filter((r) => r.type === type),
			suggestions
		};
	}
	if (step === 3) {
		const [income, savingsBase] = await Promise.all([
			planIncome(userId, currency),
			savingsBaseline(userId, currency)
		]);
		return { ...base, income, savingsBase };
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { rules, active, ...view } = await planView(userId, currency);
	const summary = view.summary!;
	if (step === 4)
		return {
			...base,
			limits: summary.limits,
			canSuggest: (await applicableSuggestions(userId, currency, plan!.id)).length > 0
		};
	return { ...base, summary, monthName: view.monthName, repeats: plan!.month === null };
};

export const actions: Actions = {
	savings: async ({ locals, cookies, request }) => {
		const userId = locals.user!.id;
		const currency = preferredCurrency(cookies);
		const r = parseSavingsForm(
			await request.formData(),
			await planIncome(userId, currency),
			currency
		);
		if (!r.ok) return fail(400, { message: r.message });
		const plan = await currentPlan(userId, currency);
		await upsertPlan(userId, currency, {
			savings: r.savings,
			savingsPercent: r.savingsPercent,
			month: plan ? plan.month : null
		});
		redirect(303, '/plan/setup?step=4');
	},
	suggested: async ({ locals, cookies }) => {
		const userId = locals.user!.id;
		const currency = preferredCurrency(cookies);
		const plan = await currentPlan(userId, currency);
		if (!plan) redirect(303, '/plan/setup?step=3');
		const limits = await applicableSuggestions(userId, currency, plan.id);
		if (limits.length > 0) await upsertLimits(userId, plan.id, limits);
		redirect(303, '/plan/setup?step=4');
	},
	finish: async ({ locals, cookies, request }) => {
		const userId = locals.user!.id;
		const currency = preferredCurrency(cookies);
		if (!(await currentPlan(userId, currency))) redirect(303, '/plan/setup?step=3');
		const repeat = (await request.formData()).get('repeat') === 'on';
		await updatePlan(userId, currency, { month: repeat ? null : currentMonth(new Date()) });
		redirect(303, '/plan?planSaved=1');
	}
};
