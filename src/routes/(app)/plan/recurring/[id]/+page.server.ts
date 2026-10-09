import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import { toIconKey } from '$lib/appearance';
import { formatAmountInput } from '$lib/money';
import { inactiveReason } from '$lib/server/plan';
import {
	deleteRecurring,
	listRecurring,
	setRecurringArchived,
	updateRecurring
} from '$lib/server/plan-queries';
import { readRecurringForm, recurringPickers } from '../form.server';

const { notFound, requireId } = notFoundHelpers('Movimiento fijo no encontrado.');

async function findRule(userId: string, id: string) {
	requireId(id);
	const [rule] = await listRecurring(userId, undefined, id);
	if (!rule) notFound();
	return rule;
}

export const load: PageServerLoad = async ({ locals, params }) => {
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
		inactiveReason: inactiveReason(rule),
		archived: rule.archivedAt !== null,
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
	update: async ({ locals, params, request }) => {
		const userId = locals.user!.id;
		const rule = await findRule(userId, params.id);
		const r = await readRecurringForm(userId, request, rule);
		if (r.failure) return r.failure;
		await updateRecurring(userId, params.id, r.data);
		redirect(303, '/plan');
	},
	archive: async ({ locals, params }) => {
		const userId = locals.user!.id;
		const rule = await findRule(userId, params.id);
		await setRecurringArchived(userId, rule.id, rule.archivedAt === null);
		redirect(303, '/plan');
	},
	delete: async ({ locals, params }) => {
		const userId = locals.user!.id;
		await findRule(userId, params.id);
		await deleteRecurring(userId, params.id);
		redirect(303, '/plan');
	}
};
