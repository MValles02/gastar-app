import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
import { CURRENCIES } from '#lib/money.ts';
import { PLAN_CURRENCY } from '#lib/plan.ts';
import { parseStep, planReturn } from '#lib/plan-wizard.ts';
import { saveLimit } from '#lib/server/plan/limit-form.ts';
import { limitCandidates, limitOptions } from '#lib/server/plan/month-plan.ts';
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
		const fd = await request.formData();
		const categoryId = String(fd.get('categoryId') ?? '');
		const amount = String(fd.get('amount') ?? '');
		const currency = CURRENCIES.find((c) => c === fd.get('currency'));
		const values = { categoryId, amount, currency: currency ?? PLAN_CURRENCY };
		const reject = (errors: { categoryId?: string; amount?: string; currency?: string }) =>
			formFail(400, { values, errors });

		if (!currency) return reject({ currency: 'Elegí una moneda.' });
		if (!(await limitCandidates(userId, plan.id)).some((c) => c.id === categoryId))
			return reject({ categoryId: 'Elegí una categoría.' });
		const saved = await saveLimit(
			userId,
			plan.id,
			{ categoryId, amount, currency },
			{ values, rejectedOn: 'categoryId' }
		);
		if (saved.failure) return saved.failure;
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
