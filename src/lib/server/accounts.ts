import { NAME_MAX_LENGTH, tooLongMessage } from '$lib/fields';
import {
	AMOUNT_EXAMPLE,
	ARS_WHOLE_MESSAGE,
	CURRENCIES,
	isWholeFor,
	parseAmount,
	type Currency
} from '$lib/money';
import { ACCOUNT_ICONS, SWATCHES } from '$lib/appearance';
import type { MovementType } from '$lib/movement';
import { totalBalance } from './dashboard';

export const DELETE_REFERENCED_MESSAGE = 'Esta cuenta tiene movimientos. Podés archivarla.';

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
export type AccountFormResult = { values: Record<string, string> } & (
	{ ok: true; data: AccountData } | { ok: false; errors: AccountFormErrors }
);

const str = (fd: FormData, key: string) => {
	const v = fd.get(key);
	return typeof v === 'string' ? v : '';
};

export function parseAccountForm(fd: FormData, mode: 'create' | 'edit'): AccountFormResult {
	const values = {
		name: str(fd, 'name'),
		currency: str(fd, 'currency'),
		initialBalance: str(fd, 'initialBalance'),
		icon: str(fd, 'icon'),
		color: str(fd, 'color')
	};
	const errors: AccountFormErrors = {};

	const name = values.name.trim();
	if (!name) errors.name = 'Ingresá un nombre.';
	else if (name.length > NAME_MAX_LENGTH)
		errors.name = tooLongMessage('El nombre', NAME_MAX_LENGTH);

	const currency = CURRENCIES.find((c) => c === values.currency);
	// A locked currency control is disabled, so edit submits none: the stored currency stays.
	const currencyOmitted = mode === 'edit' && values.currency === '';
	if (!currency && !currencyOmitted) errors.currency = 'Elegí una moneda.';

	const rawBalance = values.initialBalance.trim();
	const initialBalance = rawBalance === '' ? 0 : parseAmount(rawBalance);
	if (initialBalance === null) errors.initialBalance = `Ingresá un monto válido ${AMOUNT_EXAMPLE}.`;
	// A locked currency is not submitted in edit mode; the edit action checks it against the account.
	else if (currency && !isWholeFor(initialBalance, currency))
		errors.initialBalance = ARS_WHOLE_MESSAGE;

	if (!ACCOUNT_ICONS.some((i) => i.key === values.icon)) errors.icon = 'Elegí un ícono.';
	if (!SWATCHES.some((s) => s.key === values.color)) errors.color = 'Elegí un color.';

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	return {
		ok: true,
		values,
		data: {
			name,
			currency,
			initialBalance: initialBalance!,
			icon: values.icon,
			color: values.color
		}
	};
}

export const accountActions = ({
	referenced,
	archived
}: {
	referenced: boolean;
	archived: boolean;
}) => ({
	canDelete: !referenced,
	canArchive: !archived,
	canUnarchive: archived
});

export type OriginSum = { accountId: string; type: MovementType; amount: number };
/** `accountId` is the destination account (null never matches an account). */
export type TransferIn = { accountId: string | null; amount: number };

/** Balance per account, same formula as the dashboard total (all movements, archived included). */
export function withBalances<A extends { id: string; initialBalance: number }>(
	accounts: A[],
	originSums: OriginSum[],
	transfersIn: TransferIn[]
): (A & { balance: number })[] {
	return accounts.map((a) => ({
		...a,
		balance: totalBalance(
			a.initialBalance,
			originSums.filter((s) => s.accountId === a.id),
			transfersIn.filter((t) => t.accountId === a.id).reduce((n, t) => n + t.amount, 0)
		)
	}));
}
