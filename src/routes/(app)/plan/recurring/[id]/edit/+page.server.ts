import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import { toIconKey } from '$lib/appearance';
import { formatAmountInput } from '$lib/money';
import { parseStep } from '$lib/plan-wizard';
import { listRecurring, updateRecurring } from '$lib/server/plan-queries';
import { readRecurringForm, recurringPickers } from '../../form.server';

const { notFound, requireId } = notFoundHelpers('Movimiento fijo no encontrado.');

async function findRule(userId: string, id: string) {
	requireId(id);
	const [rule] = await listRecurring(userId, undefined, id);
	if (!rule) notFound();
	return rule;
}

/** The detail page, keeping `?wizard=N` when present. */
function detailUrl(id: string, url: URL) {
	const step = parseStep(url.searchParams.get('wizard'));
	return `/plan/recurring/${id}${step ? `?wizard=${step}` : ''}`;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const userId = locals.user!.id;
	const rule = await findRule(userId, params.id);
	const pickers = await recurringPickers(userId);
	// Keep the rule's own account and category selectable even if archived since.
	if (!pickers.accounts.some((a) => a.id === rule.accountId))
		pickers.accounts.push({
			id: rule.accountId,
			name: rule.accountName,
			icon: toIconKey(null),
			color: null,
			meta: rule.currency
		});
	if (!pickers.categories.some((c) => c.id === rule.categoryId))
		pickers.categories.push({
			id: rule.categoryId,
			name: rule.categoryName,
			icon: 'categories' as const,
			color: null,
			kind: null
		});
	return {
		...pickers,
		id: rule.id,
		detailHref: detailUrl(rule.id, url),
		values: {
			type: rule.type,
			description: rule.description,
			amount: formatAmountInput(rule.amount, rule.currency),
			accountId: rule.accountId,
			categoryId: rule.categoryId,
			dayOfMonth: String(rule.dayOfMonth)
		}
	};
};

export const actions: Actions = {
	default: async ({ locals, params, request, url }) => {
		const userId = locals.user!.id;
		const rule = await findRule(userId, params.id);
		const r = await readRecurringForm(userId, request, rule);
		if (r.failure) return r.failure;
		await updateRecurring(userId, params.id, r.data);
		redirect(303, detailUrl(params.id, url));
	}
};
