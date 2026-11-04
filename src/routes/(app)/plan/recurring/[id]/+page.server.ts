import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import { toIconKey } from '$lib/appearance';
import { formatAmountInput } from '$lib/money';
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
	setRecurringArchived,
	updateRecurring
} from '$lib/server/plan-queries';
import { readRecurringForm, recurringPickers } from '../form.server';

const { notFound, requireId } = notFoundHelpers('Movimiento fijo no encontrado.');

// Whitelist of posted fields; the type is always the stored one.
const EDITABLE = ['description', 'amount', 'accountId', 'categoryId', 'dayOfMonth'] as const;

async function findRule(userId: string, id: string) {
	requireId(id);
	const [rule] = await listRecurring(userId, undefined, id);
	if (!rule) notFound();
	return rule;
}

/** Why the rule can't be registered as a movement now; null when it can (or when it is deactivated). */
function cannotRegister(r: {
	archivedAt: Date | null;
	accountArchivedAt: Date | null;
	categoryArchivedAt: Date | null;
}) {
	if (r.archivedAt) return null;
	if (r.accountArchivedAt) return 'No se puede registrar mientras la cuenta esté archivada.';
	if (r.categoryArchivedAt) return 'No se puede registrar mientras la categoría esté archivada.';
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
		cannotRegister: cannotRegister(rule),
		archived: rule.archivedAt !== null
	};
}

export const load: PageServerLoad = async ({ locals, params, url }) => ({
	...(await detailOf(locals.user!.id, params.id)),
	wizard: parseStep(url.searchParams.get('wizard'))
});

export const actions: Actions = {
	/** Saves the posted subset of fields over the stored values, with the form's validation. */
	update: async ({ locals, params, request }) => {
		const userId = locals.user!.id;
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
		const userId = locals.user!.id;
		const rule = await findRule(userId, params.id);
		await setRecurringArchived(userId, rule.id, rule.archivedAt === null);
		return { archived: rule.archivedAt === null };
	},
	delete: async ({ locals, params, url }) => {
		const userId = locals.user!.id;
		await findRule(userId, params.id);
		await deleteRecurring(userId, params.id);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
