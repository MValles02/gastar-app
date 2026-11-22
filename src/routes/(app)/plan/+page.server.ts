import { isPlanSaved } from '#lib/toast-flags.ts';
import type { Actions, PageServerLoad } from './$types';
import { hasAnyAccount } from '#lib/server/accounts/queries.ts';
import { deletePlan } from '#lib/server/plan/queries.ts';
import { planView, recurringLists } from '#lib/server/plan/month-plan.ts';
import { toPlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const planSaved = isPlanSaved(url.searchParams);
	if (!(await hasAnyAccount(userId))) return { planSaved, hasAccount: false as const };

	const [plan, lists] = await Promise.all([planView(userId), recurringLists(userId)]);

	return { planSaved, hasAccount: true as const, plan, ...lists };
};

export const actions: Actions = {
	delete: async ({ locals }) => {
		await deletePlan(requireUser(locals).id);
		toPlan();
	}
};
