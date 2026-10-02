import { convertAmount, parseAmount } from '../money';
import { isUuid } from './accounts';
import type { Currency, MovementType } from './dashboard';
import { parseLocalDateTime } from './month';

export type MovementData = {
	type: MovementType;
	occurredAt: Date;
	description: string;
	amount: number;
	accountId: string;
	destinationAccountId: string | null;
	categoryId: string | null;
	exchangeRate: number | null;
};
export type MovementField =
	| 'type'
	| 'occurredAt'
	| 'description'
	| 'amount'
	| 'accountId'
	| 'destinationAccountId'
	| 'categoryId'
	| 'exchangeRate';
export type MovementFormErrors = Partial<Record<MovementField, string>>;
export type MovementFormResult =
	| { ok: true; values: Record<string, string>; data: MovementData }
	| { ok: false; values: Record<string, string>; errors: MovementFormErrors };

/** Row to insert (the owner is added by createMovement). */
export type MovementRow = Omit<MovementData, 'exchangeRate'> & {
	destinationAmount: number | null;
	exchangeRate: number | null;
};
export type MovementResolveResult =
	{ ok: true; row: MovementRow } | { ok: false; errors: MovementFormErrors };

const MSG = {
	type: 'Elegí un tipo de movimiento.',
	date: 'Ingresá una fecha y hora válidas.',
	descEmpty: 'Ingresá una descripción.',
	descLong: 'La descripción puede tener hasta 60 caracteres.',
	amount: 'Ingresá un monto mayor a cero, con hasta 2 decimales (ej.: 1.234,56).',
	account: 'Elegí una cuenta.',
	archivedAccount: 'Esa cuenta está archivada. Elegí otra.',
	destination: 'Elegí la cuenta de destino.',
	sameAccount: 'Elegí una cuenta distinta de la de origen.',
	rate: 'Ingresá la cotización (1 USD = X ARS), mayor a cero y con hasta 2 decimales.',
	zero: 'El monto convertido da 0. Revisá el monto o la cotización.',
	overflow: 'El monto convertido es demasiado grande.',
	category: 'Elegí una categoría.',
	archivedCategory: 'Esa categoría está archivada. Elegí otra.'
};

const FIELDS: MovementField[] = [
	'type',
	'occurredAt',
	'description',
	'amount',
	'accountId',
	'destinationAccountId',
	'categoryId',
	'exchangeRate'
];

const TYPES: MovementType[] = ['income', 'outcome', 'transfer'];

export function parseMovementForm(fd: FormData): MovementFormResult {
	const values: Record<string, string> = {};
	for (const k of FIELDS) {
		const v = fd.get(k);
		values[k] = typeof v === 'string' ? v : '';
	}
	const errors: MovementFormErrors = {};

	const type = TYPES.find((t) => t === values.type);
	if (!type) errors.type = MSG.type;

	const occurredAt =
		values.occurredAt.slice(0, 4) < '2000' ? null : parseLocalDateTime(values.occurredAt);
	if (!occurredAt) errors.occurredAt = MSG.date;

	const description = values.description.trim();
	if (!description) errors.description = MSG.descEmpty;
	else if (description.length > 60) errors.description = MSG.descLong;

	const amount = parseAmount(values.amount);
	if (amount === null || amount <= 0) errors.amount = MSG.amount;

	if (!isUuid(values.accountId)) errors.accountId = MSG.account;

	const isTransfer = type === 'transfer';
	if (isTransfer && !isUuid(values.destinationAccountId))
		errors.destinationAccountId = MSG.destination;
	if ((type === 'income' || type === 'outcome') && !isUuid(values.categoryId))
		errors.categoryId = MSG.category;

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	// Malformed/absent rate becomes null; resolveMovement rejects it only for cross-currency transfers.
	const rate = isTransfer ? parseAmount(values.exchangeRate) : null;
	return {
		ok: true,
		values,
		data: {
			type: type!,
			occurredAt: occurredAt!,
			description,
			amount: amount!,
			accountId: values.accountId,
			destinationAccountId: isTransfer ? values.destinationAccountId : null,
			categoryId: isTransfer ? null : values.categoryId,
			exchangeRate: rate
		}
	};
}

type AccountRef = { id: string; currency: Currency; archivedAt: Date | null };
type CategoryRef = { id: string; archivedAt: Date | null };

/** Pure over looked-up (owner-checked) rows; undefined means not found / not owned. */
export function resolveMovement(
	data: MovementData,
	rows: {
		origin: AccountRef | undefined;
		destination?: AccountRef | undefined;
		category?: CategoryRef | undefined;
	}
): MovementResolveResult {
	const errors: MovementFormErrors = {};
	const { origin, destination, category } = rows;
	const base = { ...data, destinationAccountId: null, categoryId: null, exchangeRate: null };

	if (!origin) errors.accountId = MSG.account;
	else if (origin.archivedAt) errors.accountId = MSG.archivedAccount;

	if (data.type !== 'transfer') {
		if (!category) errors.categoryId = MSG.category;
		else if (category.archivedAt) errors.categoryId = MSG.archivedCategory;
		if (Object.keys(errors).length > 0) return { ok: false, errors };
		return {
			ok: true,
			row: { ...base, categoryId: category!.id, destinationAmount: null }
		};
	}

	if (!destination) errors.destinationAccountId = MSG.destination;
	else if (origin && destination.id === origin.id) errors.destinationAccountId = MSG.sameAccount;
	else if (destination.archivedAt) errors.destinationAccountId = MSG.archivedAccount;
	if (Object.keys(errors).length > 0) return { ok: false, errors };

	const o = origin!;
	const d = destination!;
	if (o.currency === d.currency) {
		return {
			ok: true,
			row: { ...base, destinationAccountId: d.id, destinationAmount: data.amount }
		};
	}
	if (!data.exchangeRate || data.exchangeRate <= 0)
		return { ok: false, errors: { exchangeRate: MSG.rate } };
	const converted = convertAmount(data.amount, data.exchangeRate, o.currency, d.currency);
	if (converted === null) return { ok: false, errors: { amount: MSG.overflow } };
	if (converted <= 0) return { ok: false, errors: { amount: MSG.zero } };
	return {
		ok: true,
		row: {
			...base,
			destinationAccountId: d.id,
			destinationAmount: converted,
			exchangeRate: data.exchangeRate
		}
	};
}
