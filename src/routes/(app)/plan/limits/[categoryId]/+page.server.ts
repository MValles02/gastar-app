import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseStep, planReturn } from '#lib/plan-wizard.ts';
import { deleteLimit } from '#lib/server/plan/queries.ts';
import { saveLimit } from '#lib/server/plan/limit-form.ts';
import { limitView } from '#lib/server/plan/month-plan.ts';
import { requireLimit, requirePlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';

export const load: PageServerLoad = async ({ locals, params, url }) => ({
	...(await limitView(requireUser(locals).id, params.categoryId)),
	wizard: parseStep(url.searchParams.get('wizard'))
});

export const actions: Actions = {
	/** Changes the limit's amount; returns it in cents (what the autosave's Deshacer restores). */
	update: async ({ locals, request, params }) => {
		const userId = requireUser(locals).id;
		const plan = await requirePlan(userId);
		const limit = await requireLimit(userId, plan.id, params.categoryId);
		const amount = String((await request.formData()).get('amount') ?? '');

		const saved = await saveLimit(
			userId,
			plan.id,
			{ categoryId: params.categoryId, amount, currency: limit.currency },
			{ values: { amount }, rejectedOn: 'amount' }
		);
		if (saved.failure) return saved.failure;
		return { amount: saved.cents };
	},
	delete: async ({ locals, url, params }) => {
		const userId = requireUser(locals).id;
		const plan = await requirePlan(userId);
		await requireLimit(userId, plan.id, params.categoryId);
		await deleteLimit(userId, plan.id, params.categoryId);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
