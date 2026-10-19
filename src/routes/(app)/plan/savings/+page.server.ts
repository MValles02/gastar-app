import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { preferredCurrency } from '$lib/server/currency-pref';
import { parseSavingsForm } from '$lib/server/plan';
import { currentPlan, planIncome, updatePlan } from '$lib/server/plan-queries';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const userId = locals.user!.id;
	const currency = preferredCurrency(cookies);
	const plan = await currentPlan(userId, currency);
	if (!plan) redirect(303, '/plan');
	return {
		currency,
		income: await planIncome(userId, currency),
		savings: plan.savings,
		savingsPercent: plan.savingsPercent
	};
};

export const actions: Actions = {
	default: async ({ locals, cookies, request }) => {
		const userId = locals.user!.id;
		const currency = preferredCurrency(cookies);
		if (!(await currentPlan(userId, currency))) redirect(303, '/plan');
		const r = parseSavingsForm(
			await request.formData(),
			await planIncome(userId, currency),
			currency
		);
		if (!r.ok) return fail(400, { message: r.message });
		await updatePlan(userId, currency, { savings: r.savings, savingsPercent: r.savingsPercent });
		redirect(303, '/plan?planSaved=1');
	}
};
