import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { parseLimitAmount, planReturn } from '#lib/plan-wizard.ts';
import { deleteLimit, upsertLimits } from '#lib/server/plan/queries.ts';
import { limitView } from '#lib/server/plan/month-plan.ts';
import { planFail, requireLimit, requirePlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';

export const load: PageServerLoad = async ({ locals, params }) =>
	limitView(requireUser(locals).id, params.categoryId);

export const actions: Actions = {
	/** Changes the limit's amount; returns it in cents (what the autosave's Deshacer restores). */
	update: async ({ locals, request, params }) => {
		const userId = requireUser(locals).id;
		const plan = await requirePlan(userId);
		const limit = await requireLimit(userId, plan.id, params.categoryId);
		const amount = String((await request.formData()).get('amount') ?? '');

		const parsed = parseLimitAmount(amount, limit.currency);
		const values = { amount };
		if ('message' in parsed) return formFail(400, { values, errors: { amount: parsed.message } });
		try {
			await upsertLimits(userId, plan.id, [
				{ categoryId: params.categoryId, amount: parsed.cents, currency: limit.currency }
			]);
		} catch (e) {
			return planFail(e, 'amount', values);
		}
		return { amount: parsed.cents };
	},
	delete: async ({ locals, url, params }) => {
		const userId = requireUser(locals).id;
		const plan = await requirePlan(userId);
		await requireLimit(userId, plan.id, params.categoryId);
		await deleteLimit(userId, plan.id, params.categoryId);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
