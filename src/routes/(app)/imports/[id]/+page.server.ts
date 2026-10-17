import { fail, redirect } from '@sveltejs/kit';
import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
import { isUuid } from '$lib/server/db/util';
import { notFoundHelpers } from '$lib/server/not-found';
import {
	getImport,
	importDateTime,
	importPrefill,
	importTypes,
	listImportRules,
	rejectImport
} from '$lib/server/mp-import-queries';
import { failIfUnavailable, movementPickers } from '../../movements/form.server';
import { approveWithValues } from '../approve.server';
import type { Actions, PageServerLoad } from './$types';

const { notFound, requireId } = notFoundHelpers('Movimiento no encontrado.');

/** The user's item (404 for invalid, foreign and missing ids). */
async function findItem(userId: string, id: string) {
	requireId(id);
	const item = await getImport(userId, id);
	if (!item) notFound();
	return item;
}

/** Active ARS accounts other than the import account: the only valid counter accounts (no exchange rate). */
async function pickers(userId: string, importAccountId: string) {
	const { accounts, categories } = await movementPickers(userId);
	return {
		categories,
		accounts: accounts.filter((a) => a.currency === 'ARS' && a.id !== importAccountId)
	};
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	const item = await findItem(userId, params.id);
	if (item.status !== 'pending') notFound();
	const [{ categories, accounts }, rules] = await Promise.all([
		pickers(userId, item.accountId),
		listImportRules(userId)
	]);
	const prefill = importPrefill(item, rules, categories, accounts);
	return {
		item: {
			id: item.id,
			isCredit: item.isCredit,
			amount: item.amount,
			dateLabel: importDateTime(item.occurredAt),
			counterpartyNickname: item.counterpartyNickname,
			rawDescription: item.rawDescription
		},
		initial: {
			type: prefill.type as string,
			description: prefill.description,
			categoryId: prefill.categoryId,
			counterAccountId: prefill.counterAccountId
		},
		review: prefill.review,
		categories,
		accounts
	};
};

export const actions: Actions = {
	approve: async ({ locals, params, request }) => {
		const userId = locals.user!.id;
		const item = await findItem(userId, params.id);
		if (item.status !== 'pending') redirect(303, '/imports?done=stale');

		const fd = await request.formData();
		const field = (k: string) => {
			const v = fd.get(k);
			return typeof v === 'string' ? v : '';
		};
		const values = {
			type: field('type'),
			description: field('description').trim(),
			categoryId: field('categoryId'),
			counterAccountId: field('counterAccountId')
		};
		const errors: Partial<Record<keyof typeof values | 'form', string>> = {};

		const type = importTypes(item.isCredit).find((t) => t === values.type);
		if (!type) errors.type = 'Elegí un tipo de movimiento.';
		if (!values.description) errors.description = 'Ingresá una descripción.';
		else if (values.description.length > DESCRIPTION_MAX_LENGTH)
			errors.description = `La descripción puede tener hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`;

		const { accounts } = await pickers(userId, item.accountId);
		if (type === 'transfer') {
			if (!isUuid(values.counterAccountId)) errors.counterAccountId = 'Elegí la cuenta.';
			else if (!accounts.some((a) => a.id === values.counterAccountId))
				errors.counterAccountId = 'Elegí una cuenta en pesos que no esté archivada.';
		} else if (type && !isUuid(values.categoryId)) errors.categoryId = 'Elegí una categoría.';
		if (Object.keys(errors).length > 0) return fail(400, { values, errors });

		let approved;
		try {
			approved = await approveWithValues(userId, item, { ...values, type: type! });
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
		const userId = locals.user!.id;
		await findItem(userId, params.id);
		redirect(303, `/imports?done=${await rejectImport(userId, params.id)}`);
	}
};
