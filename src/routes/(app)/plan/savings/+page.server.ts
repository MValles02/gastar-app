import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import type { Actions, PageServerLoad } from './$types';
import { PLAN_CURRENCY } from '$lib/plan';
import { currentPlan, planIncome, updatePlan } from '$lib/server/plan-queries';
import { savingsBaseline } from '$lib/server/plan-view';
import { requireUser } from '$lib/server/guards';
import { parseSavingsForm } from './form.server';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const plan = await currentPlan(userId);
	if (!plan) redirect(303, '/plan');
	return {
		...(await savingsBaseline(userId)),
		income: await planIncome(userId),
		savings: plan.savings,
		savingsPercent: plan.savingsPercent
	};
};

export const actions: Actions = {
	update: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		if (!(await currentPlan(userId))) redirect(303, '/plan');
		const r = parseSavingsForm(await request.formData(), await planIncome(userId), PLAN_CURRENCY);
		if (!r.ok) return formFail(400, { errors: { savings: r.message } });
		await updatePlan(userId, { savings: r.savings, savingsPercent: r.savingsPercent });
		return { savings: r.savings, savingsPercent: r.savingsPercent };
	}
};
