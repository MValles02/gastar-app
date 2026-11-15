import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import type { Actions, PageServerLoad } from './$types';
import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import { CURRENCIES } from '$lib/money';
import { parseLimitAmount, planReturn } from '$lib/plan-wizard';
import { listCategories } from '$lib/server/categories-queries';
import { currentPlan, planLimits, PlanRejected, upsertLimits } from '$lib/server/plan-queries';
import { limitSuggestions } from '$lib/server/plan-view';
import { requireUser } from '$lib/server/guards';

/** Active expense (or both) categories that have no limit yet. */
async function offered(userId: string, planId: string) {
	const [categories, limits] = await Promise.all([
		listCategories(userId),
		planLimits(userId, planId)
	]);
	const limited = new Set(limits.map((l) => l.categoryId));
	return categories.filter((c) => c.kind !== 'income' && !limited.has(c.id));
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const plan = (await currentPlan(userId)) ?? redirect(303, '/plan');
	const [categories, suggestions] = await Promise.all([
		offered(userId, plan.id),
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
		const plan = (await currentPlan(userId)) ?? redirect(303, '/plan');
		const fd = await request.formData();
		const categoryId = String(fd.get('categoryId') ?? '');
		const amount = String(fd.get('amount') ?? '');
		const currency = CURRENCIES.find((c) => c === fd.get('currency'));
		const reject = (errors: { categoryId?: string; amount?: string; currency?: string }) =>
			formFail(400, { values: { categoryId, amount, currency: currency ?? 'ARS' }, errors });

		if (!currency) return reject({ currency: 'Elegí una moneda.' });
		if (!(await offered(userId, plan.id)).some((c) => c.id === categoryId))
			return reject({ categoryId: 'Elegí una categoría.' });
		const parsed = parseLimitAmount(amount, currency);
		if ('message' in parsed) return reject({ amount: parsed.message });

		try {
			await upsertLimits(userId, plan.id, [{ categoryId, amount: parsed.cents, currency }]);
		} catch (e) {
			if (e instanceof PlanRejected) return reject({ categoryId: e.message });
			throw e;
		}
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
