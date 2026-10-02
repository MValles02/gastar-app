import { parseAmount } from '../money';
import { ACCOUNT_ICONS, SWATCHES } from '../appearance';
import { totalBalance, type Currency, type MovementType } from './dashboard';

export const CURRENCY_LOCKED_MESSAGE =
	'No podés cambiar la moneda porque la cuenta tiene movimientos.';
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
export type AccountFormResult =
	| { ok: true; data: AccountData }
	| { ok: false; values: Record<string, string>; errors: AccountFormErrors };

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
	else if (name.length > 40) errors.name = 'El nombre puede tener hasta 40 caracteres.';

	let currency: Currency | undefined;
	if (values.currency === 'ARS' || values.currency === 'USD') currency = values.currency;
	else if (!(mode === 'edit' && values.currency === '')) errors.currency = 'Elegí una moneda.';

	const rawBalance = values.initialBalance.trim();
	const initialBalance = rawBalance === '' ? 0 : parseAmount(rawBalance);
	if (initialBalance === null)
		errors.initialBalance = 'Ingresá un monto válido, con hasta 2 decimales (ej.: 1.234,56).';

	if (!ACCOUNT_ICONS.some((i) => i.key === values.icon)) errors.icon = 'Elegí un ícono.';
	if (!SWATCHES.some((s) => s.key === values.color)) errors.color = 'Elegí un color.';

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	return {
		ok: true,
		data: {
			name,
			currency,
			initialBalance: initialBalance!,
			icon: values.icon,
			color: values.color
		}
	};
}

export const currencyChangeAllowed = (prev: Currency, next: Currency, referenced: boolean) =>
	prev === next || !referenced;

export const accountActions = ({
	referenced,
	archived
}: {
	referenced: boolean;
	archived: boolean;
}) => ({
	canDelete: !referenced,
	canArchive: referenced && !archived,
	canUnarchive: archived
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

/** Escapes LIKE wildcards (and the escape char) so user input matches literally. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');

export type OriginSum = { accountId: string; type: MovementType; amount: number };
export type TransferIn = { accountId: string; amount: number };

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
