import { fail, redirect } from '@sveltejs/kit';
import { MOVEMENT_MESSAGES as MSG } from '#lib/movement.ts';
import { isUuid } from '#lib/server/db/util.ts';
import { readFields } from '#lib/server/forms.ts';
import { descriptionField, movementTypeOf } from '#lib/server/movements/form.ts';
import {
	getImport,
	importDateLabel,
	importPrefill,
	importTypes,
	listImportRules,
	rejectImport,
	rememberKey
} from '#lib/server/import-queries.ts';
import { failIfUnavailable } from '#lib/server/movements/detail.ts';
import { movementPickers } from '#lib/server/movements/pickers.ts';
import { approveWithValues, counterAccountsOf } from '#lib/server/import-approve.ts';
import { activeRuleItems } from '#lib/server/recurring/rule-items.ts';
import { notFoundHelpers, requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

const { notFound, requireId } = notFoundHelpers('Movimiento no encontrado.');

/** The user's item (404 for invalid, foreign and missing ids). */
async function findItem(userId: string, id: string) {
	requireId(id);
	const item = await getImport(userId, id);
	if (!item) notFound();
	return item;
}

/** Categories and the valid counter accounts of the item. */
async function pickers(userId: string, item: { accountId: string; currency: string }) {
	const { accounts, categories } = await movementPickers(userId);
	return { categories, accounts: counterAccountsOf(accounts, item) };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = requireUser(locals).id;
	const item = await findItem(userId, params.id);
	if (item.status !== 'pending') notFound();
	const [{ categories, accounts }, importRules, rules] = await Promise.all([
		pickers(userId, item),
		listImportRules(userId),
		activeRuleItems(userId, item.currency, item.isCredit ? 'income' : 'outcome')
	]);
	const prefill = importPrefill(item, importRules, categories, accounts);
	return {
		item: {
			id: item.id,
			isCredit: item.isCredit,
			amount: item.amount,
			currency: item.currency,
			dateLabel: importDateLabel(item.source, item.occurredAt),
			rawDescription: item.rawDescription
		},
		initial: {
			type: prefill.type as string,
			description: prefill.description,
			categoryId: prefill.categoryId,
			counterAccountId: prefill.counterAccountId,
			recurringId: rules.some((r) => r.id === prefill.recurringId) ? prefill.recurringId : '',
			remember: ''
		},
		// No rule suggests anything for it: the form asks which type it is.
		unknown: prefill.suggestion === null,
		// Unchecked by default, even when a rule prefilled the form; hidden when there is no stable key.
		rememberLabel: rememberKey(item)?.label ?? null,
		categories,
		accounts,
		rules
	};
};

export const actions: Actions = {
	approve: async ({ locals, params, request }) => {
		const userId = requireUser(locals).id;
		const item = await findItem(userId, params.id);
		if (item.status !== 'pending') redirect(303, '/imports?done=stale');

		// 'remember' is 'on' when the box is checked; kept as text so a failed submit re-renders it.
		const posted = readFields(await request.formData(), [
			'type',
			'description',
			'categoryId',
			'counterAccountId',
			'recurringId',
			'remember'
		]);
		const description = descriptionField(posted.description);
		const values = { ...posted, description: description.value };
		const errors: Partial<Record<keyof typeof values | 'form', string>> = {};

		// The movement form's type and description checks, with the types this item can take.
		const type = movementTypeOf(values.type, importTypes(item.isCredit));
		if (!type) errors.type = MSG.type;
		if (description.error) errors.description = description.error;

		const { accounts } = await pickers(userId, item);
		if (type === 'transfer') {
			if (!isUuid(values.counterAccountId)) errors.counterAccountId = 'Elegí la cuenta.';
			else if (!accounts.some((a) => a.id === values.counterAccountId))
				errors.counterAccountId =
					item.currency === 'USD'
						? 'Elegí una cuenta en dólares que no esté archivada.'
						: 'Elegí una cuenta en pesos que no esté archivada.';
		} else if (type && !isUuid(values.categoryId)) errors.categoryId = MSG.category;
		if (type && type !== 'transfer' && values.recurringId) {
			const rules = await activeRuleItems(
				userId,
				item.currency,
				item.isCredit ? 'income' : 'outcome'
			);
			if (!rules.some((r) => r.id === values.recurringId))
				errors.recurringId = 'Elegí un pago fijo válido.';
		}
		if (Object.keys(errors).length > 0) return fail(400, { values, errors });

		let approved;
		try {
			approved = await approveWithValues(
				userId,
				item,
				{ ...values, type: type!, recurringId: type === 'transfer' ? '' : values.recurringId },
				values.remember === 'on'
			);
		} catch (e) {
			return failIfUnavailable(e, values);
		}
		if (approved.errors) {
			// The pickers were checked above, so only races reach here: category errors show on the
			// category row, anything else (account, amount, rate) as one form-level message.
			const { categoryId, ...rest } = approved.errors;
			return fail(400, { values, errors: { categoryId, form: Object.values(rest)[0] } });
		}
		redirect(303, `/imports?done=${approved.result}`);
	},

	reject: async ({ locals, params }) => {
		const userId = requireUser(locals).id;
		await findItem(userId, params.id);
		redirect(303, `/imports?done=${await rejectImport(userId, params.id)}`);
	}
};
