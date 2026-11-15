import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import type { Actions, PageServerLoad } from './$types';
import { parseStep } from '$lib/plan-wizard';
import { listAccounts } from '$lib/server/accounts/queries';
import { listCategories } from '$lib/server/categories/queries';
import { currentMonth } from '$lib/server/month';
import { PLAN_CURRENCY } from '$lib/plan';
import {
	currentPlan,
	planIncome,
	planLimits,
	updatePlan,
	upsertLimits,
	upsertPlan
} from '$lib/server/plan/queries';
import {
	limitSuggestions,
	planView,
	recurringLists,
	recurringSuggestions,
	savingsBaseline
} from '$lib/server/plan/month-plan';
import { requireUser } from '$lib/server/guards';
import { parseSavingsForm } from '$lib/server/plan/savings-form';

/** Suggested limits the wizard can apply: active non-income categories with no limit yet and a suggestion above zero. */
async function applicableSuggestions(userId: string, planId: string | null) {
	const [categories, suggestions, limits] = await Promise.all([
		listCategories(userId),
		limitSuggestions(userId),
		planId ? planLimits(userId, planId) : []
	]);
	const limited = new Set(limits.map((l) => l.categoryId));
	return categories
		.filter((c) => c.kind !== 'income' && !limited.has(c.id))
		.map((c) => {
			const avg = suggestions.get(c.id);
			// The pesos average wins; with no pesos spending the limit is in dollars.
			const currency = avg && avg.ARS > 0 ? ('ARS' as const) : ('USD' as const);
			return { categoryId: c.id, amount: avg?.[currency] ?? 0, currency };
		})
		.filter((l) => l.amount > 0);
}

type Summary = NonNullable<Awaited<ReturnType<typeof planView>>['summary']>;

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const param = parseStep(url.searchParams.get('step'));
	const step = param ?? 1;

	const [accounts, plan] = await Promise.all([listAccounts(userId), currentPlan(userId)]);
	if (accounts.length === 0) redirect(303, '/plan');
	if (!param && plan) redirect(303, '/plan');
	if (step >= 4 && !plan) redirect(303, '/plan/setup?step=3');

	// One shape for every step (SvelteKit turns a union of returns into optional fields).
	const none = {
		active: [] as Awaited<ReturnType<typeof recurringLists>>['incomes'],
		inactive: [] as Awaited<ReturnType<typeof recurringLists>>['inactive'],
		income: 0,
		savingsBase: { base: 0, daysLeft: 1 },
		savings: { savings: plan?.savings ?? 0, savingsPercent: plan?.savingsPercent ?? null },
		suggestions: [] as Awaited<ReturnType<typeof recurringSuggestions>>,
		limits: [] as Summary['limits'],
		canSuggest: false,
		summary: null as Summary | null,
		monthName: '',
		repeats: true
	};
	const base = { ...none, step };
	if (step <= 2) {
		const [lists, suggestions] = await Promise.all([
			recurringLists(userId),
			step === 2 ? recurringSuggestions(userId) : []
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
		const [income, savingsBase] = await Promise.all([planIncome(userId), savingsBaseline(userId)]);
		return { ...base, income, savingsBase };
	}

	const view = await planView(userId);
	const summary = view.summary!;
	if (step === 4)
		return {
			...base,
			limits: summary.limits,
			canSuggest: (await applicableSuggestions(userId, plan!.id)).length > 0
		};
	return { ...base, summary, monthName: view.monthName, repeats: plan!.month === null };
};

export const actions: Actions = {
	savings: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		const r = parseSavingsForm(await request.formData(), await planIncome(userId), PLAN_CURRENCY);
		if (!r.ok) return formFail(400, { formError: r.message });
		const plan = await currentPlan(userId);
		await upsertPlan(userId, {
			savings: r.savings,
			savingsPercent: r.savingsPercent,
			month: plan ? plan.month : null
		});
		redirect(303, '/plan/setup?step=4');
	},
	suggested: async ({ locals }) => {
		const userId = requireUser(locals).id;
		const plan = await currentPlan(userId);
		if (!plan) redirect(303, '/plan/setup?step=3');
		const limits = await applicableSuggestions(userId, plan.id);
		if (limits.length > 0) await upsertLimits(userId, plan.id, limits);
		redirect(303, '/plan/setup?step=4');
	},
	finish: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		if (!(await currentPlan(userId))) redirect(303, '/plan/setup?step=3');
		const repeat = (await request.formData()).get('repeat') === 'on';
		await updatePlan(userId, { month: repeat ? null : currentMonth(new Date()) });
		redirect(303, '/plan?planSaved=1');
	}
};
