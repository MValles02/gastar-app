import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { requirePlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';
import { saveSavings, savingsView } from '#lib/server/plan/savings-form.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const { savingsBase, ...view } = await savingsView(userId, await requirePlan(userId));
	return { ...savingsBase, ...view };
};

export const actions: Actions = {
	update: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		await requirePlan(userId);
		const r = await saveSavings(userId, await request.formData(), 'update');
		if (!r.ok) return formFail(400, { errors: { savings: r.message } });
		return { savings: r.savings, savingsPercent: r.savingsPercent };
	}
};
