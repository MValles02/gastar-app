import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { PLAN_CURRENCY } from '#lib/plan.ts';
import { planIncome, updatePlan } from '#lib/server/plan/queries.ts';
import { savingsBaseline } from '#lib/server/plan/month-plan.ts';
import { requirePlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';
import { parseSavingsForm } from '#lib/server/plan/savings-form.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const plan = await requirePlan(userId);
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
		await requirePlan(userId);
		const r = parseSavingsForm(await request.formData(), await planIncome(userId), PLAN_CURRENCY);
		if (!r.ok) return formFail(400, { errors: { savings: r.message } });
		await updatePlan(userId, { savings: r.savings, savingsPercent: r.savingsPercent });
		return { savings: r.savings, savingsPercent: r.savingsPercent };
	}
};
