import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import { formatAmountInput } from '$lib/money';
import { parseLimitAmount, planReturn } from '$lib/plan-wizard';
import { preferredCurrency } from '$lib/server/currency-pref';
import { notFoundHelpers } from '$lib/server/not-found';
import { currentMonth } from '$lib/server/month';
import {
	deleteLimit,
	getPlan,
	planLimits,
	PlanRejected,
	upsertLimits
} from '$lib/server/plan-queries';
import { limitSuggestions, planView } from '$lib/server/plan-view';

const { notFound, requireId } = notFoundHelpers('Límite no encontrado.');

/** The current plan (a one-month plan for another month counts as none) or back to /plan. */
async function currentPlan(userId: string, currency: ReturnType<typeof preferredCurrency>) {
	const [plan] = await getPlan(userId, currency);
	if (!plan || (plan.month !== null && plan.month !== currentMonth(new Date())))
		redirect(303, '/plan');
	return plan;
}

/** The limit on the current plan's category `id`, or a 404 (malformed, foreign and missing alike). */
async function findLimit(userId: string, planId: string, id: string) {
	requireId(id);
	const limit = (await planLimits(userId, planId)).find((l) => l.categoryId === id);
	if (!limit) return notFound();
	return limit;
}

export const load: PageServerLoad = async ({ locals, cookies, params }) => {
	const userId = locals.user!.id;
	const currency = preferredCurrency(cookies);
	const plan = await currentPlan(userId, currency);
	const limit = await findLimit(userId, plan.id, params.categoryId);
	const [suggestions, view] = await Promise.all([
		limitSuggestions(userId, currency),
		planView(userId, currency)
	]);
	return {
		progress: view.summary?.limits.find((l) => l.categoryId === limit.categoryId),
		currency,
		category: {
			id: limit.categoryId,
			name: limit.name,
			icon: toCategoryIconKey(limit.icon) ?? ('categories' as const),
			color: toSwatchKey(limit.color)
		},
		amount: formatAmountInput(limit.amount, currency),
		suggested: suggestions.get(limit.categoryId) ?? 0
	};
};

export const actions: Actions = {
	save: async ({ locals, cookies, request, url, params }) => {
		const userId = locals.user!.id;
		const currency = preferredCurrency(cookies);
		const plan = await currentPlan(userId, currency);
		await findLimit(userId, plan.id, params.categoryId);
		const amount = String((await request.formData()).get('amount') ?? '');

		const parsed = parseLimitAmount(amount, currency);
		if ('message' in parsed) return fail(400, { amount, error: parsed.message });
		try {
			await upsertLimits(userId, plan.id, [
				{ categoryId: params.categoryId, amount: parsed.cents }
			]);
		} catch (e) {
			if (e instanceof PlanRejected) return fail(400, { amount, error: e.message });
			throw e;
		}
		redirect(303, planReturn(url.searchParams.get('wizard')));
	},
	delete: async ({ locals, cookies, url, params }) => {
		const userId = locals.user!.id;
		const plan = await currentPlan(userId, preferredCurrency(cookies));
		await findLimit(userId, plan.id, params.categoryId);
		await deleteLimit(userId, plan.id, params.categoryId);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
