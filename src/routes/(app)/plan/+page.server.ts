import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { preferredCurrency } from '$lib/server/currency-pref';
import { accountSummary } from '$lib/server/dashboard-queries';
import { deletePlan } from '$lib/server/plan-queries';
import { planView, recurringLists } from '$lib/server/plan-view';
import { requireUser } from '$lib/server/require-user';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = requireUser(locals).id;
	const currency = preferredCurrency(cookies);
	const planSaved = url.searchParams.get('planSaved') === '1';
	const summary = await accountSummary(userId);
	if (!summary.some((s) => s.currency === currency && s.count > 0))
		return { currency, planSaved, hasCurrency: false as const };

	const [plan, lists] = await Promise.all([
		planView(userId, currency),
		recurringLists(userId, currency)
	]);

	return { currency, planSaved, hasCurrency: true as const, plan, ...lists };
};

export const actions: Actions = {
	delete: async ({ locals, cookies }) => {
		await deletePlan(requireUser(locals).id, preferredCurrency(cookies));
		redirect(303, '/plan');
	}
};
