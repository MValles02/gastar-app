import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import type { Actions, PageServerLoad } from './$types';
import { preferredCurrency } from '$lib/server/currency-pref';
import { currentPlan, planIncome, updatePlan } from '$lib/server/plan-queries';
import { savingsBaseline } from '$lib/server/plan-view';
import { requireUser } from '$lib/server/require-user';
import { parseSavingsForm } from './form.server';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const userId = requireUser(locals).id;
	const currency = preferredCurrency(cookies);
	const plan = await currentPlan(userId, currency);
	if (!plan) redirect(303, '/plan');
	return {
		currency,
		...(await savingsBaseline(userId, currency)),
		income: await planIncome(userId, currency),
		savings: plan.savings,
		savingsPercent: plan.savingsPercent
	};
};

export const actions: Actions = {
	update: async ({ locals, cookies, request }) => {
		const userId = requireUser(locals).id;
		const currency = preferredCurrency(cookies);
		if (!(await currentPlan(userId, currency))) redirect(303, '/plan');
		const r = parseSavingsForm(
			await request.formData(),
			await planIncome(userId, currency),
			currency
		);
		if (!r.ok) return formFail(400, { errors: { savings: r.message } });
		await updatePlan(userId, currency, { savings: r.savings, savingsPercent: r.savingsPercent });
		return { savings: r.savings, savingsPercent: r.savingsPercent };
	}
};
