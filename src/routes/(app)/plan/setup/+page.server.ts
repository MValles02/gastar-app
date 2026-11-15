import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { parseStep } from '#lib/plan-wizard.ts';
import { listAccounts } from '#lib/server/accounts/queries.ts';
import { currentMonth } from '#lib/server/month.ts';
import { PLAN_CURRENCY } from '#lib/plan.ts';
import {
	currentPlan,
	planIncome,
	updatePlan,
	upsertLimits,
	upsertPlan
} from '#lib/server/plan/queries.ts';
import {
	limitCandidates,
	limitSuggestions,
	planView,
	recurringLists,
	recurringSuggestions,
	savingsBaseline
} from '#lib/server/plan/month-plan.ts';
import { toPlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';
import { parseSavingsForm } from '#lib/server/plan/savings-form.ts';

/** Suggested limits the wizard can apply: limit candidates with a suggestion above zero. */
async function applicableSuggestions(userId: string, planId: string | null) {
	const [categories, suggestions] = await Promise.all([
		limitCandidates(userId, planId),
		limitSuggestions(userId)
	]);
	return categories
		.map((c) => {
			const avg = suggestions.get(c.id);
			// The pesos average wins; with no pesos spending the limit is in dollars.
			const currency = avg && avg.ARS > 0 ? ('ARS' as const) : ('USD' as const);
			return { categoryId: c.id, amount: avg?.[currency] ?? 0, currency };
		})
		.filter((l) => l.amount > 0);
}

/** One shape per step, told apart by `step`. */
export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const param = parseStep(url.searchParams.get('step'));
	const step = param ?? 1;

	const [accounts, plan] = await Promise.all([listAccounts(userId), currentPlan(userId)]);
	if (accounts.length === 0) toPlan();
	if (!param && plan) toPlan();
	if (step >= 4 && !plan) redirect(303, '/plan/setup?step=3');

	if (step === 1 || step === 2) {
		const [lists, suggestions] = await Promise.all([
			recurringLists(userId),
			step === 2 ? recurringSuggestions(userId) : []
		]);
		const type = step === 1 ? 'income' : 'outcome';
		const active = step === 1 ? lists.incomes : lists.outcomes;
		return {
			step,
			active,
			inactive: lists.inactive.filter((r) => r.type === type),
			suggestions,
			// In plan pesos: ARS as is, USD at the plan rate (left out without one).
			total: active.reduce(
				(a, r) => a + (r.currency === PLAN_CURRENCY ? r.amount : (r.converted ?? 0)),
				0
			)
		};
	}
	if (step === 3) {
		const [income, savingsBase] = await Promise.all([planIncome(userId), savingsBaseline(userId)]);
		return {
			step,
			income,
			savingsBase,
			savings: { savings: plan?.savings ?? 0, savingsPercent: plan?.savingsPercent ?? null }
		};
	}

	const view = await planView(userId);
	const summary = view.summary!;
	if (step === 4)
		return {
			step,
			limits: summary.limits,
			canSuggest: (await applicableSuggestions(userId, plan!.id)).length > 0
		};
	return { step, summary, monthName: view.monthName, repeats: plan!.month === null };
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
