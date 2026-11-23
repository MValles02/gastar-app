import { formFail } from '#lib/form.ts';
import { formatAmountInput, parseAmount, type Currency } from '#lib/money.ts';
import { MOVEMENT_MESSAGES as MSG, type MovementType, refError } from '#lib/movement.ts';
import { MAX_DAY_OF_MONTH } from '#lib/plan.ts';
import { getAccount } from '../accounts/queries';
import { getCategory } from '../categories/queries';
import { isUuid } from '../db/util';
import { amountFor, editFormData, readFields } from '../forms';
import { descriptionField, kindMismatchMessage } from '../movements/form';
import { recurringSuggestions } from '../plan/month-plan';

const FIELDS = ['type', 'description', 'amount', 'accountId', 'categoryId', 'dayOfMonth'] as const;
export const EDITABLE = ['description', 'amount', 'accountId', 'categoryId', 'dayOfMonth'] as const;

export const toFormValues = (r: {
	type: MovementType;
	description: string;
	amount: number;
	currency: Currency;
	accountId: string;
	categoryId: string;
	dayOfMonth: number;
}) => ({
	type: r.type,
	description: r.description,
	amount: formatAmountInput(r.amount, r.currency),
	accountId: r.accountId,
	categoryId: r.categoryId,
	dayOfMonth: String(r.dayOfMonth)
});

/**
 * The new-rule form's start values: the suggestion, else a blank rule (the only account preselected).
 * A suggestion id is recomputed, never trusted: the description and amount are not in the URL.
 */
export async function newRuleInitial(
	userId: string,
	{
		type,
		suggestionId,
		accounts
	}: { type: 'income' | 'outcome'; suggestionId: string | null; accounts: { id: string }[] }
) {
	const s =
		suggestionId && type === 'outcome'
			? (await recurringSuggestions(userId)).find((c) => c.id === suggestionId)
			: undefined;
	return s
		? {
				type: 'outcome',
				description: s.description,
				amount: formatAmountInput(s.amount, s.currency),
				accountId: s.accountId,
				categoryId: s.categoryId,
				dayOfMonth: String(s.dayOfMonth)
			}
		: {
				type: type as string,
				description: '',
				amount: '',
				accountId: accounts.length === 1 ? accounts[0].id : '',
				categoryId: '',
				dayOfMonth: ''
			};
}

export const editedForm = (row: Parameters<typeof toFormValues>[0], posted: FormData) =>
	editFormData(toFormValues(row), posted, EDITABLE);

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
 * The currency is unknown here, so the ARS whole-peso check (`amountFor`) is the actions' job.
 */
export function parseRecurringForm(fd: FormData): RecurringFormResult {
	const values: RecurringFormValues = readFields(fd, FIELDS);
	const errors: Partial<RecurringFormValues> = {};
	const type = values.type === 'income' || values.type === 'outcome' ? values.type : null;
	if (!type) errors.type = 'Elegí si es un ingreso o un pago.';
	const { value: description, error: descriptionError } = descriptionField(values.description);
	if (descriptionError) errors.description = descriptionError;
	const amount = parseAmount(values.amount);
	if (amount === null || amount <= 0) errors.amount = MSG.amount;
	if (!isUuid(values.accountId)) errors.accountId = MSG.account;
	if (!isUuid(values.categoryId)) errors.categoryId = MSG.category;
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

/**
 * Parses the rule form and checks its account and category. On an edit, `fd` is
 * `editFormData(toFormValues(rule), posted, EDITABLE)` and `current` the rule's own refs.
 */
export async function readRecurringForm(
	userId: string,
	fd: FormData,
	current?: { accountId: string; categoryId: string; archivedOk?: string[] }
) {
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
	if (!account || refError(account, { kept: keeps(account.id, current?.accountId) }))
		errors.accountId = 'Elegí una cuenta activa.';
	else {
		const whole = amountFor(account.currency)(parsed.data.amount);
		if (whole) errors.amount = whole;
	}
	// A kept category (the rule's own, or undo-restored) is also exempt from the kind check.
	const keptCategory = !!category && keeps(category.id, current?.categoryId);
	const categoryError =
		category &&
		refError(category, {
			kept: keptCategory,
			kindFor: keptCategory ? undefined : parsed.data.type
		});
	if (!category || categoryError === 'archived') errors.categoryId = 'Elegí una categoría activa.';
	else if (categoryError === 'kind' && category.kind)
		errors.categoryId = kindMismatchMessage(category.kind);
	if (Object.keys(errors).length > 0)
		return { failure: formFail(400, { values: parsed.values, errors }) };
	return { data: parsed.data };
}
