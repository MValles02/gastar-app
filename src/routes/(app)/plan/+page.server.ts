import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { accountSummary } from '$lib/server/accounts/queries';
import { deletePlan } from '$lib/server/plan/queries';
import { planView, recurringLists } from '$lib/server/plan/month-plan';
import { requireUser } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const planSaved = url.searchParams.get('planSaved') === '1';
	const summary = await accountSummary(userId);
	if (!summary.some((s) => s.count > 0)) return { planSaved, hasAccount: false as const };

	const [plan, lists] = await Promise.all([planView(userId), recurringLists(userId)]);

	return { planSaved, hasAccount: true as const, plan, ...lists };
};

export const actions: Actions = {
	delete: async ({ locals }) => {
		await deletePlan(requireUser(locals).id);
		redirect(303, '/plan');
	}
};
