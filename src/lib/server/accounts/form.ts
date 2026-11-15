import { NAME_MAX_LENGTH, tooLongMessage } from '#lib/fields.ts';
import {
	AMOUNT_EXAMPLE,
	CURRENCIES,
	formatAmountInput,
	parseAmount,
	type Currency
} from '#lib/money.ts';
import { ACCOUNT_ICONS, SWATCHES, toIconKey, toSwatchKey } from '#lib/appearance.ts';
import { amountFor, editFormData, readFields, requiredText } from '../forms';

export const NOT_FOUND_MESSAGE = 'Cuenta no encontrada.';
export const DELETE_REFERENCED_MESSAGE = 'Esta cuenta tiene movimientos. Podés archivarla.';

export const FIELDS = ['name', 'currency', 'initialBalance', 'icon', 'color'] as const;
/** The only fields `?/update` takes; the currency never changes there. */
export const EDITABLE = ['name', 'icon', 'color', 'initialBalance'] as const;

export type AccountData = {
	name: string;
	/** Absent on edit when the form did not send it (keep current). */
	currency?: Currency;
	initialBalance: number;
	icon: string;
	color: string;
};
export type AccountFormErrors = Partial<Record<keyof AccountData, string>>;
/** `values` are the raw submitted strings, for re-rendering the form after a failure. */
export type AccountFormResult<D = AccountData> = { values: Record<string, string> } & (
	{ ok: true; data: D } | { ok: false; errors: AccountFormErrors }
);

const nameField = requiredText(NAME_MAX_LENGTH, {
	empty: 'Ingresá un nombre.',
	long: tooLongMessage('El nombre', NAME_MAX_LENGTH)
});

/** The stored account as the form's strings (what `parseAccountForm` takes back). */
export const toFormValues = (a: {
	name: string;
	currency: Currency;
	initialBalance: number;
	icon: string | null;
	color: string | null;
}) => ({
	name: a.name,
	currency: a.currency,
	initialBalance: formatAmountInput(a.initialBalance, a.currency),
	icon: toIconKey(a.icon),
	color: toSwatchKey(a.color) ?? 'green'
});

/** The form `?/update` validates: `row`'s stored values with the posted EDITABLE fields over them. */
export const editedForm = (row: Parameters<typeof toFormValues>[0], posted: FormData) =>
	editFormData(toFormValues(row), posted, EDITABLE);

export function parseAccountForm(
	fd: FormData,
	mode: 'create'
): AccountFormResult<AccountData & { currency: Currency }>;
export function parseAccountForm(fd: FormData, mode: 'edit'): AccountFormResult;
export function parseAccountForm(fd: FormData, mode: 'create' | 'edit'): AccountFormResult {
	const values = readFields(fd, FIELDS);
	const errors: AccountFormErrors = {};

	const name = nameField(values.name);
	if (name.error) errors.name = name.error;

	const currency = CURRENCIES.find((c) => c === values.currency);
	// A locked currency control is disabled, so edit submits none: the stored currency stays.
	const currencyOmitted = mode === 'edit' && values.currency === '';
	if (!currency && !currencyOmitted) errors.currency = 'Elegí una moneda.';

	const rawBalance = values.initialBalance.trim();
	const initialBalance = rawBalance === '' ? 0 : parseAmount(rawBalance);
	if (initialBalance === null) errors.initialBalance = `Ingresá un monto válido ${AMOUNT_EXAMPLE}.`;
	// A locked currency is not submitted in edit mode; the edit action checks it against the account.
	else if (currency) {
		const whole = amountFor(currency)(initialBalance);
		if (whole) errors.initialBalance = whole;
	}

	if (!ACCOUNT_ICONS.some((i) => i.key === values.icon)) errors.icon = 'Elegí un ícono.';
	if (!SWATCHES.some((s) => s.key === values.color)) errors.color = 'Elegí un color.';

	if (initialBalance === null || Object.keys(errors).length > 0)
		return { ok: false, values, errors };
	return {
		ok: true,
		values,
		data: { name: name.value, currency, initialBalance, icon: values.icon, color: values.color }
	};
}
