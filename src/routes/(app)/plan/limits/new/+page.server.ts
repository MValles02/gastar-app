import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
import { PLAN_CURRENCY } from '#lib/plan.ts';
import { parseStep, planReturn } from '#lib/plan-wizard.ts';
import { createLimit } from '#lib/server/plan/limit-form.ts';
import { limitOptions } from '#lib/server/plan/month-plan.ts';
import { requirePlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const plan = await requirePlan(userId);
	const options = await limitOptions(userId, plan.id);
	return {
		categories: options.map((c) => ({
			id: c.id,
			name: c.name,
			icon: toCategoryIconKey(c.icon) ?? ('categories' as const),
			color: toSwatchKey(c.color),
			suggested: c.suggested
		})),
		wizard: parseStep(url.searchParams.get('wizard')),
		initial: { categoryId: '', amount: '', currency: PLAN_CURRENCY }
	};
};

export const actions: Actions = {
	default: async ({ locals, request, url }) => {
		const userId = requireUser(locals).id;
		const plan = await requirePlan(userId);
		const saved = await createLimit(userId, plan.id, await request.formData());
		if (saved.failure) return saved.failure;
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
