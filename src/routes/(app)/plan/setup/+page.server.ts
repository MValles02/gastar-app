import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseStep } from '$lib/plan-wizard';
import type { Currency } from '$lib/money';
import { listAccounts } from '$lib/server/accounts-queries';
import { listCategories } from '$lib/server/categories-queries';
import { preferredCurrency } from '$lib/server/currency-pref';
import { currentMonth } from '$lib/server/month';
import { parseSavingsForm } from '$lib/server/plan';
import {
	getPlan,
	planIncome,
	planLimits,
	updatePlan,
	upsertLimits,
	upsertPlan
} from '$lib/server/plan-queries';
import { limitSuggestions, planView, recurringLists } from '$lib/server/plan-view';

/** The user's plan for `cur` when it is the current one (a one-month plan for another month counts as none). */
async function currentPlan(userId: string, cur: Currency) {
	const [plan] = await getPlan(userId, cur);
	return plan && (plan.month === null || plan.month === currentMonth(new Date())) ? plan : null;
}

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
		savings: { savings: plan?.savings ?? 0, savingsPercent: plan?.savingsPercent ?? null },
		limits: [] as Summary['limits'],
		canSuggest: false,
		summary: null as Summary | null,
		monthName: '',
		repeats: true
	};
	const base = { ...none, currency, step };
	if (step <= 2) {
		const lists = await recurringLists(userId, currency);
		const type = step === 1 ? 'income' : 'outcome';
		return {
			...base,
			active: step === 1 ? lists.incomes : lists.outcomes,
			inactive: lists.inactive.filter((r) => r.type === type)
		};
	}
	if (step === 3) return { ...base, income: await planIncome(userId, currency) };

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
