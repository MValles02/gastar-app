import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import type { Actions, PageServerLoad } from './$types';
import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import { formatAmountInput } from '$lib/money';
import { parseLimitAmount, planReturn } from '$lib/plan-wizard';
import {
	deleteLimit,
	currentPlan,
	planLimits,
	PlanRejected,
	upsertLimits
} from '$lib/server/plan-queries';
import { limitSuggestions, planView } from '$lib/server/plan-view';
import { notFoundHelpers, requireUser } from '$lib/server/guards';

const { notFound, requireId } = notFoundHelpers('Límite no encontrado.');

/** The limit on the current plan's category `id`, or a 404 (malformed, foreign and missing alike). */
async function findLimit(userId: string, planId: string, id: string) {
	requireId(id);
	const limit = (await planLimits(userId, planId)).find((l) => l.categoryId === id);
	if (!limit) return notFound();
	return limit;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = requireUser(locals).id;
	const plan = (await currentPlan(userId)) ?? redirect(303, '/plan');
	const limit = await findLimit(userId, plan.id, params.categoryId);
	const [suggestions, view] = await Promise.all([limitSuggestions(userId), planView(userId)]);
	return {
		progress: view.summary?.limits.find((l) => l.categoryId === limit.categoryId),
		elapsedShare: view.summary?.elapsedShare ?? 0,
		currency: limit.currency,
		category: {
			id: limit.categoryId,
			name: limit.name,
			icon: toCategoryIconKey(limit.icon) ?? ('categories' as const),
			color: toSwatchKey(limit.color)
		},
		amount: formatAmountInput(limit.amount, limit.currency),
		suggested: suggestions.get(limit.categoryId)?.[limit.currency] ?? 0
	};
};

export const actions: Actions = {
	/** Changes the limit's amount; returns it in cents (what the autosave's Deshacer restores). */
	update: async ({ locals, request, params }) => {
		const userId = requireUser(locals).id;
		const plan = (await currentPlan(userId)) ?? redirect(303, '/plan');
		const limit = await findLimit(userId, plan.id, params.categoryId);
		const amount = String((await request.formData()).get('amount') ?? '');

		const parsed = parseLimitAmount(amount, limit.currency);
		const values = { amount };
		if ('message' in parsed) return formFail(400, { values, errors: { amount: parsed.message } });
		try {
			await upsertLimits(userId, plan.id, [
				{ categoryId: params.categoryId, amount: parsed.cents, currency: limit.currency }
			]);
		} catch (e) {
			if (e instanceof PlanRejected)
				return formFail(400, { values, errors: { amount: e.message } });
			throw e;
		}
		return { amount: parsed.cents };
	},
	delete: async ({ locals, url, params }) => {
		const userId = requireUser(locals).id;
		const plan = (await currentPlan(userId)) ?? redirect(303, '/plan');
		await findLimit(userId, plan.id, params.categoryId);
		await deleteLimit(userId, plan.id, params.categoryId);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
