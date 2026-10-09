import {
	AMOUNT_EXAMPLE,
	ARS_WHOLE_MESSAGE,
	convertAmount,
	isWholeFor,
	parseAmount
} from '../money';
import { isUuid } from './db/util';
import { CURRENCIES, type Currency } from '$lib/money';
import type { MovementType } from './dashboard';
import { dayStart } from './month';

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

export const UNAVAILABLE_MESSAGE = 'La cuenta o la categoría ya no está disponible.';

const MSG = {
	type: 'Elegí un tipo de movimiento.',
	date: 'Ingresá una fecha válida.',
	descEmpty: 'Ingresá una descripción.',
	descLong: 'La descripción puede tener hasta 60 caracteres.',
	amount: `Ingresá un monto mayor a cero ${AMOUNT_EXAMPLE}.`,
	account: 'Elegí una cuenta.',
	archivedAccount: 'Esa cuenta está archivada. Elegí otra.',
	destination: 'Elegí la cuenta de destino.',
	sameAccount: 'Elegí una cuenta distinta de la de origen.',
	rate: 'Ingresá la cotización (1 USD = X ARS) en pesos enteros y mayor a cero.',
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

	const day = values.occurredAt;
	const occurredAt = day.slice(0, 4) >= '2000' && validDay(day) ? dayStart(day) : null;
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
	},
	// Archived rows already referenced by the movement being edited stay valid.
	keep: { accountIds: string[]; categoryId: string | null } = { accountIds: [], categoryId: null }
): MovementResolveResult {
	const errors: MovementFormErrors = {};
	const { origin, destination, category } = rows;
	const base = { ...data, destinationAccountId: null, categoryId: null, exchangeRate: null };

	if (!origin) errors.accountId = MSG.account;
	else if (origin.archivedAt && !keep.accountIds.includes(origin.id))
		errors.accountId = MSG.archivedAccount;
	else if (!isWholeFor(data.amount, origin.currency)) errors.amount = ARS_WHOLE_MESSAGE;

	if (data.type !== 'transfer') {
		if (!category) errors.categoryId = MSG.category;
		else if (category.archivedAt && category.id !== keep.categoryId)
			errors.categoryId = MSG.archivedCategory;
		if (Object.keys(errors).length > 0) return { ok: false, errors };
		return {
			ok: true,
			row: { ...base, categoryId: category!.id, destinationAmount: null }
		};
	}

	if (!destination) errors.destinationAccountId = MSG.destination;
	else if (origin && destination.id === origin.id) errors.destinationAccountId = MSG.sameAccount;
	else if (destination.archivedAt && !keep.accountIds.includes(destination.id))
		errors.destinationAccountId = MSG.archivedAccount;
	if (Object.keys(errors).length > 0) return { ok: false, errors };

	const o = origin!;
	const d = destination!;
	if (o.currency === d.currency) {
		return {
			ok: true,
			row: { ...base, destinationAccountId: d.id, destinationAmount: data.amount }
		};
	}
	if (!data.exchangeRate || data.exchangeRate <= 0 || !isWholeFor(data.exchangeRate, 'ARS'))
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

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export type MovementFilterQuery = {
	q: string;
	from: string;
	to: string;
	type: MovementType | '';
	account: string;
	category: string;
	currency?: Currency | '';
};

// Year 9999 is rejected so the day after `to` is always representable.
const validDay = (s: string) => YMD_RE.test(s) && s < '9999' && dayStart(s) !== null;

/** Pure: normalises URL search params; any invalid value becomes empty/default. */
export function parseMovementFilters(sp: URLSearchParams) {
	const get = (k: string) => sp.get(k) ?? '';
	const day = (k: string) => (validDay(get(k)) ? get(k) : '');
	const uuid = (k: string) => (isUuid(get(k)) ? get(k) : '');
	let from = day('from');
	let to = day('to');
	if (from && to && from > to) [from, to] = [to, from];
	const q = get('q').trim();
	const query: MovementFilterQuery = {
		q: q.length > 60 ? '' : q,
		from,
		to,
		type: TYPES.find((t) => t === get('type')) ?? '',
		account: uuid('account'),
		category: uuid('category'),
		currency: CURRENCIES.find((c) => c === get('currency')) ?? ''
	};
	const n = Number(get('page'));
	const page = Number.isSafeInteger(n) && n >= 1 && n <= 10000 ? n : 1;
	// currency is a segmented control outside the filters disclosure: kept in `values`, not counted in `activeCount`.
	const shown: Record<string, string> = { ...query };
	const activeCount = Object.values({ ...shown, currency: '' }).filter(Boolean).length;
	return { values: shown, query, page, activeCount };
}
