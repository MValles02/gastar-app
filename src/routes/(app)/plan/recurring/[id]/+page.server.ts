import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import { toIconKey } from '$lib/appearance';
import {
	dueLabel,
	inactiveReason,
	isRecurringActive,
	recurringStatus,
	type RecurringStatus
} from '$lib/server/plan';
import { currentMonth, localDay, monthRange } from '$lib/server/month';
import { parseStep, planReturn } from '$lib/plan-wizard';
import {
	deleteRecurring,
	listRecurring,
	paidRecurring,
	setRecurringArchived
} from '$lib/server/plan-queries';
import { recurringPickers } from '../form.server';

const { notFound, requireId } = notFoundHelpers('Movimiento fijo no encontrado.');

async function findRule(userId: string, id: string) {
	requireId(id);
	const [rule] = await listRecurring(userId, undefined, id);
	if (!rule) notFound();
	return rule;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const userId = locals.user!.id;
	const rule = await findRule(userId, params.id);
	const pickers = await recurringPickers(userId);
	// The rule's own account and category may be archived since, so they are not in the pickers.
	const account = pickers.accounts.find((a) => a.id === rule.accountId) ?? {
		id: rule.accountId,
		name: rule.accountName,
		icon: toIconKey(null),
		color: null,
		meta: rule.currency
	};
	const category = pickers.categories.find((c) => c.id === rule.categoryId) ?? {
		id: rule.categoryId,
		name: rule.categoryName,
		icon: 'categories' as const,
		color: null,
		kind: null
	};
	const now = new Date();
	const ym = currentMonth(now);
	let thisMonth: { status: RecurringStatus; label: string } | null = null;
	if (isRecurringActive(rule)) {
		const paid = (await paidRecurring(userId, monthRange(ym))).some(
			(p) => p.recurringId === rule.id
		);
		const s = recurringStatus(rule.dayOfMonth, paid, ym, localDay(now));
		thisMonth = { status: s.status, label: dueLabel(s, rule.type) };
	}
	return {
		id: rule.id,
		type: rule.type,
		description: rule.description,
		amount: rule.amount,
		currency: rule.currency,
		dayOfMonth: rule.dayOfMonth,
		account,
		category,
		thisMonth,
		inactiveReason: inactiveReason(rule),
		archived: rule.archivedAt !== null,
		wizard: parseStep(url.searchParams.get('wizard'))
	};
};

export const actions: Actions = {
	archive: async ({ locals, params, url }) => {
		const userId = locals.user!.id;
		const rule = await findRule(userId, params.id);
		await setRecurringArchived(userId, rule.id, rule.archivedAt === null);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	},
	delete: async ({ locals, params, url }) => {
		const userId = locals.user!.id;
		await findRule(userId, params.id);
		await deleteRecurring(userId, params.id);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
