import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { preferredCurrency } from '$lib/server/currency-pref';
import { currentMonth } from '$lib/server/month';
import { parseSavingsForm } from '$lib/server/plan';
import { getPlan, planIncome, updatePlan } from '$lib/server/plan-queries';

/** The user's plan for `currency` when it is the current one (a plan for another month counts as none). */
async function currentPlan(userId: string, currency: ReturnType<typeof preferredCurrency>) {
	const [plan] = await getPlan(userId, currency);
	return plan && (plan.month === null || plan.month === currentMonth(new Date())) ? plan : null;
}

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
