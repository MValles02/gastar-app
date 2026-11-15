import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { toIconKey } from '$lib/appearance';
import { formatAmountInput } from '$lib/money';
import { inactiveReason, isRecurringActive } from '$lib/plan';
import { parseStep, planReturn } from '$lib/plan-wizard';
import {
	deleteRecurring,
	getRecurring,
	setRecurringArchived,
	updateRecurring
} from '$lib/server/recurring/queries';
import { ruleDueThisMonth } from '$lib/server/plan/month-plan';
import { notFoundHelpers, requireUser } from '$lib/server/guards';
import { readRecurringForm, recurringPickers } from '$lib/server/recurring/form';

const { notFound, requireId } = notFoundHelpers('Movimiento fijo no encontrado.');

// The type is never posted: a rule keeps its stored type.
const EDITABLE = ['description', 'amount', 'accountId', 'categoryId', 'dayOfMonth'] as const;

async function findRule(userId: string, id: string) {
	requireId(id);
	const [rule] = await getRecurring(userId, id);
	if (!rule) notFound();
	return rule;
}

/** Why the rule does not count in the plan now; null when it does (or when it is deactivated). */
function cannotRegister(r: {
	archivedAt: Date | null;
	accountArchivedAt: Date | null;
	categoryArchivedAt: Date | null;
}) {
	if (r.archivedAt) return null;
	if (r.accountArchivedAt) return 'No cuenta en el plan mientras la cuenta esté archivada.';
	if (r.categoryArchivedAt) return 'No cuenta en el plan mientras la categoría esté archivada.';
	return null;
}

/** The rule as the detail shows it (the load without `wizard`; what `update` returns). */
async function detailOf(userId: string, id: string) {
	const rule = await findRule(userId, id);
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
	const thisMonth = isRecurringActive(rule) ? await ruleDueThisMonth(userId, rule) : null;
	return {
		id: rule.id,
		type: rule.type,
		description: rule.description,
		amount: rule.amount,
		previousAmount: rule.previousAmount,
		currency: rule.currency,
		dayOfMonth: rule.dayOfMonth,
		account,
		category,
		thisMonth,
		// Pickers for the rows; the rule's own archived account/category stays listed, flagged.
		accounts: pickers.accounts.some((a) => a.id === account.id)
			? pickers.accounts.map((a) => ({ ...a, archived: false }))
			: [
					...pickers.accounts.map((a) => ({ ...a, archived: false })),
					{ ...account, archived: true }
				],
		categories: pickers.categories.some((c) => c.id === category.id)
			? pickers.categories.map((c) => ({ ...c, archived: false }))
			: [
					...pickers.categories.map((c) => ({ ...c, archived: false })),
					{ ...category, archived: true }
				],
		inactiveReason: inactiveReason(rule),
		cannotRegister: cannotRegister(rule),
		archived: rule.archivedAt !== null
	};
}

export const load: PageServerLoad = async ({ locals, params, url }) => ({
	...(await detailOf(requireUser(locals).id, params.id)),
	wizard: parseStep(url.searchParams.get('wizard'))
});

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const userId = requireUser(locals).id;
		const rule = await findRule(userId, params.id);
		const posted = await request.formData();
		const fd = new FormData();
		fd.set('type', rule.type);
		fd.set('description', rule.description);
		fd.set('amount', formatAmountInput(rule.amount, rule.currency));
		fd.set('accountId', rule.accountId);
		fd.set('categoryId', rule.categoryId);
		fd.set('dayOfMonth', String(rule.dayOfMonth));
		for (const k of EDITABLE) {
			const v = posted.get(k);
			if (typeof v === 'string') fd.set(k, v);
		}
		// An undo may restore the archived account/category the rule had.
		const archivedOk =
			posted.get('undo') === '1'
				? (['accountId', 'categoryId'] as const)
						.map((k) => posted.get(k))
						.filter((v): v is string => typeof v === 'string' && v !== '')
				: undefined;
		const r = await readRecurringForm(userId, fd, { ...rule, archivedOk });
		if (r.failure) return r.failure;
		await updateRecurring(userId, params.id, r.data);
		return { rule: await detailOf(userId, params.id) };
	},
	archive: async ({ locals, params }) => {
		const userId = requireUser(locals).id;
		const rule = await findRule(userId, params.id);
		await setRecurringArchived(userId, rule.id, rule.archivedAt === null);
		return { archived: rule.archivedAt === null };
	},
	delete: async ({ locals, params, url }) => {
		const userId = requireUser(locals).id;
		await findRule(userId, params.id);
		await deleteRecurring(userId, params.id);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
