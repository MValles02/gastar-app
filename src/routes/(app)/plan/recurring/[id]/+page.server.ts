import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { toIconKey } from '#lib/appearance.ts';
import { cannotRegister, inactiveReason, isRecurringActive } from '#lib/plan.ts';
import { parseStep, planReturn } from '#lib/plan-wizard.ts';
import {
	deleteRecurring,
	getRecurring,
	setRecurringArchived,
	updateRecurring
} from '#lib/server/recurring/queries.ts';
import { ruleDueThisMonth } from '#lib/server/plan/month-plan.ts';
import { notFoundHelpers, requireUser } from '#lib/server/guards.ts';
import {
	editedForm,
	readRecurringForm,
	recurringPickers,
	toFormValues
} from '#lib/server/recurring/form.ts';
import { undoArchivedOk } from '#lib/server/forms.ts';

const { notFound, requireId } = notFoundHelpers('Movimiento fijo no encontrado.');

async function findRule(userId: string, id: string) {
	requireId(id);
	const [rule] = await getRecurring(userId, id);
	if (!rule) notFound();
	return rule;
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
		meta: rule.currency,
		currency: rule.currency
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
			? pickers.accounts
			: [...pickers.accounts, { ...account, archived: true }],
		categories: pickers.categories.some((c) => c.id === category.id)
			? pickers.categories
			: [...pickers.categories, { ...category, archived: true }],
		inactiveReason: inactiveReason(rule),
		cannotRegister: cannotRegister(rule),
		archived: rule.archivedAt !== null,
		values: toFormValues(rule)
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
		// An undo may restore the archived account/category the rule had.
		const archivedOk = undoArchivedOk(posted, ['accountId', 'categoryId']);
		const r = await readRecurringForm(userId, editedForm(rule, posted), { ...rule, archivedOk });
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
