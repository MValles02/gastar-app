import { formFail } from '#lib/form.ts';
import { toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
import { accountOption, getAccount, listAccounts } from '../accounts/queries';
import { getCategory, listCategories } from '../categories/queries';
import { DESCRIPTION_MAX_LENGTH, DESCRIPTION_TOO_LONG_MESSAGE } from '#lib/fields.ts';
import { AMOUNT_EXAMPLE, ARS_WHOLE_MESSAGE, isWholeFor, parseAmount } from '#lib/money.ts';
import type { MovementType } from '#lib/movement.ts';
import { isUuid } from '../db/util';
import { kindMismatchMessage } from '../movements/form';
import { MAX_DAY_OF_MONTH } from '#lib/plan.ts';

type RecurringFormValues = Record<
	'type' | 'description' | 'amount' | 'accountId' | 'categoryId' | 'dayOfMonth',
	string
>;
type RecurringFormResult =
	| {
			ok: true;
			values: RecurringFormValues;
			data: {
				type: Exclude<MovementType, 'transfer'>;
				description: string;
				amount: number;
				accountId: string;
				categoryId: string;
				dayOfMonth: number;
			};
	  }
	| { ok: false; values: RecurringFormValues; errors: Partial<RecurringFormValues> };

/**
 * Pure: validates the recurring income/payment form (ownership is checked by the caller).
 * The currency is unknown here, so the ARS whole-peso check (`isWholeFor`) is the actions' job.
 */
function parseRecurringForm(fd: FormData): RecurringFormResult {
	const get = (k: string) => {
		const v = fd.get(k);
		return typeof v === 'string' ? v : '';
	};
	const values: RecurringFormValues = {
		type: get('type'),
		description: get('description'),
		amount: get('amount'),
		accountId: get('accountId'),
		categoryId: get('categoryId'),
		dayOfMonth: get('dayOfMonth')
	};
	const errors: Partial<RecurringFormValues> = {};
	const type = values.type === 'income' || values.type === 'outcome' ? values.type : null;
	if (!type) errors.type = 'Elegí si es un ingreso o un pago.';
	const description = values.description.trim();
	if (!description) errors.description = 'Ingresá una descripción.';
	else if (description.length > DESCRIPTION_MAX_LENGTH)
		errors.description = DESCRIPTION_TOO_LONG_MESSAGE;
	const amount = parseAmount(values.amount);
	if (amount === null || amount <= 0)
		errors.amount = `Ingresá un monto mayor a cero ${AMOUNT_EXAMPLE}.`;
	if (!isUuid(values.accountId)) errors.accountId = 'Elegí una cuenta.';
	if (!isUuid(values.categoryId)) errors.categoryId = 'Elegí una categoría.';
	const day = Number(values.dayOfMonth);
	if (!/^\d{1,2}$/.test(values.dayOfMonth) || day < 1 || day > MAX_DAY_OF_MONTH)
		errors.dayOfMonth = `Elegí un día entre 1 y ${MAX_DAY_OF_MONTH}.`;
	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	return {
		ok: true,
		values,
		data: {
			type: type!,
			description,
			amount: amount!,
			accountId: values.accountId,
			categoryId: values.categoryId,
			dayOfMonth: day
		}
	};
}

export async function recurringPickers(userId: string) {
	const [accountRows, categoryRows] = await Promise.all([
		listAccounts(userId),
		listCategories(userId)
	]);
	return {
		accounts: accountRows.map((a) => ({
			...accountOption(a),
			meta: a.currency
		})),
		categories: categoryRows.map((c) => ({
			id: c.id,
			name: c.name,
			icon: toCategoryIconKey(c.icon) ?? ('categories' as const),
			color: toSwatchKey(c.color),
			kind: c.kind
		}))
	};
}

export async function readRecurringForm(
	userId: string,
	fd: FormData,
	current?: { accountId: string; categoryId: string; type: string; archivedOk?: string[] }
) {
	// An edit never changes the type: the stored one wins over whatever was submitted.
	if (current) fd.set('type', current.type);
	const parsed = parseRecurringForm(fd);
	if (!parsed.ok)
		return { failure: formFail(400, { values: parsed.values, errors: parsed.errors }) };
	const [[account], [category]] = await Promise.all([
		getAccount(userId, parsed.data.accountId),
		getCategory(userId, parsed.data.categoryId)
	]);
	const errors: Record<string, string> = {};
	// An edit may keep the rule's own account/category even if archived since; an undo may restore archived ones.
	const keeps = (id: string, own?: string) => id === own || !!current?.archivedOk?.includes(id);
	if (!account || (account.archivedAt && !keeps(account.id, current?.accountId)))
		errors.accountId = 'Elegí una cuenta activa.';
	else if (!isWholeFor(parsed.data.amount, account.currency)) errors.amount = ARS_WHOLE_MESSAGE;
	if (!category || (category.archivedAt && !keeps(category.id, current?.categoryId)))
		errors.categoryId = 'Elegí una categoría activa.';
	else if (
		(category.kind === 'income' || category.kind === 'outcome') &&
		category.kind !== parsed.data.type &&
		!keeps(category.id, current?.categoryId)
	)
		errors.categoryId = kindMismatchMessage(category.kind);
	if (Object.keys(errors).length > 0)
		return { failure: formFail(400, { values: parsed.values, errors }) };
	return { data: parsed.data };
}
