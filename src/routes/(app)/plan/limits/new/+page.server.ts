import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
import { CURRENCIES } from '#lib/money.ts';
import { parseLimitAmount, planReturn } from '#lib/plan-wizard.ts';
import { upsertLimits } from '#lib/server/plan/queries.ts';
import { limitCandidates, limitSuggestions } from '#lib/server/plan/month-plan.ts';
import { planFail, requirePlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const plan = await requirePlan(userId);
	const [categories, suggestions] = await Promise.all([
		limitCandidates(userId, plan.id),
		limitSuggestions(userId)
	]);
	return {
		categories: categories.map((c) => ({
			id: c.id,
			name: c.name,
			icon: toCategoryIconKey(c.icon) ?? ('categories' as const),
			color: toSwatchKey(c.color),
			suggested: suggestions.get(c.id) ?? { ARS: 0, USD: 0 }
		}))
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
		const values = { categoryId, amount, currency: currency ?? 'ARS' };
		const reject = (errors: { categoryId?: string; amount?: string; currency?: string }) =>
			formFail(400, { values, errors });

		if (!currency) return reject({ currency: 'Elegí una moneda.' });
		if (!(await limitCandidates(userId, plan.id)).some((c) => c.id === categoryId))
			return reject({ categoryId: 'Elegí una categoría.' });
		const parsed = parseLimitAmount(amount, currency);
		if ('message' in parsed) return reject({ amount: parsed.message });

		try {
			await upsertLimits(userId, plan.id, [{ categoryId, amount: parsed.cents, currency }]);
		} catch (e) {
			return planFail(e, 'categoryId', values);
		}
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
