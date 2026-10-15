import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { preferredCurrency } from '$lib/server/currency-pref';
import { accountSummary } from '$lib/server/dashboard-queries';
import { deletePlan } from '$lib/server/plan-queries';
import { planView, recurringLists } from '$lib/server/plan-view';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const currency = preferredCurrency(cookies);
	const saved = url.searchParams.get('saved') === '1';
	const planSaved = url.searchParams.get('planSaved') === '1';
	const summary = await accountSummary(userId);
	if (!summary.some((s) => s.currency === currency && s.count > 0))
		return { currency, saved, planSaved, hasCurrency: false as const };

	const now = new Date();
	// `rules` and `active` are server-only (see planView); the rest of the view goes to the client.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [{ rules, active, ...plan }, lists] = await Promise.all([
		planView(userId, currency, now),
		recurringLists(userId, currency, now)
	]);

	return { currency, saved, planSaved, hasCurrency: true as const, plan, ...lists };
};

export const actions: Actions = {
	delete: async ({ locals, cookies }) => {
		await deletePlan(locals.user!.id, preferredCurrency(cookies));
		redirect(303, '/plan');
	}
};
