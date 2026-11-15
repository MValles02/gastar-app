import { MIN_DAY } from '$lib/dates';
import { DESCRIPTION_MAX_LENGTH } from '$lib/fields';
import { MOVEMENT_MESSAGES as MSG, MOVEMENT_TYPES, type MovementType } from '$lib/movement';
import {
	ARS_WHOLE_MESSAGE,
	convertAmount,
	CURRENCIES,
	type Currency,
	isValidRate,
	isWholeFor,
	parseAmount
} from '$lib/money';
import { isUuid } from './db/util';
import { dayStart, localDay } from './month';

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
const FIELDS = [
	'type',
	'occurredAt',
	'description',
	'amount',
	'accountId',
	'destinationAccountId',
	'categoryId',
	'exchangeRate'
] as const;
type MovementField = (typeof FIELDS)[number];
type MovementFormErrors = Partial<Record<MovementField, string>>;
type MovementFormResult =
	| { ok: true; values: Record<string, string>; data: MovementData }
	| { ok: false; values: Record<string, string>; errors: MovementFormErrors };

/** Row to insert (the owner is added by createMovement). */
export type MovementRow = MovementData & { destinationAmount: number | null };
type MovementResolveResult =
	{ ok: true; row: MovementRow } | { ok: false; errors: MovementFormErrors };

export const UNAVAILABLE_MESSAGE = 'La cuenta o la categoría ya no está disponible.';

// A longer search term cannot match any description, so it is dropped.
const QUERY_MAX_LENGTH = DESCRIPTION_MAX_LENGTH;
const MAX_PAGE = 10000;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
// Year 9999 is rejected so the day after `to` is always representable.
const validDay = (s: string) => YMD_RE.test(s) && s < '9999' && dayStart(s) !== null;

export const kindMismatchMessage = (kind: 'income' | 'outcome') => MSG.kindMismatch[kind];

export function parseMovementForm(fd: FormData): MovementFormResult {
	const values: Record<string, string> = {};
	for (const k of FIELDS) {
		const v = fd.get(k);
		values[k] = typeof v === 'string' ? v : '';
	}
	const errors: MovementFormErrors = {};

	const type = MOVEMENT_TYPES.find((t) => t === values.type);
	if (!type) errors.type = MSG.type;

	const day = values.occurredAt;
	const occurredAt = validDay(day) && day >= MIN_DAY ? dayStart(day) : null;
	if (!occurredAt) errors.occurredAt = MSG.date;

	const description = values.description.trim();
	if (!description) errors.description = MSG.descEmpty;
	else if (description.length > DESCRIPTION_MAX_LENGTH) errors.description = MSG.descLong;

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
type CategoryRef = { id: string; archivedAt: Date | null; kind: MovementType | null };

/** Pure over looked-up (owner-checked) rows; undefined means not found / not owned. */
export function resolveMovement(
	data: MovementData,
	rows: {
		origin: AccountRef | undefined;
		destination?: AccountRef | undefined;
		category?: CategoryRef | undefined;
	},
	// Archived rows already referenced by the movement being edited stay valid.
	keep: {
		accountIds: string[];
		categoryId: string | null;
		amount?: number | null;
		/** Ids whose archived checks are skipped (an undo restoring what the movement had). */
		archivedOk?: string[];
	} = {
		accountIds: [],
		categoryId: null,
		amount: null
	}
): MovementResolveResult {
	const errors: MovementFormErrors = {};
	const { origin, destination, category } = rows;
	const base = { ...data, destinationAccountId: null, categoryId: null, exchangeRate: null };

	if (!origin) errors.accountId = MSG.account;
	else if (
		origin.archivedAt &&
		!keep.accountIds.includes(origin.id) &&
		!keep.archivedOk?.includes(origin.id)
	)
		errors.accountId = MSG.archivedAccount;
	else if (
		!(keep.amount != null && data.amount === keep.amount) &&
		!isWholeFor(data.amount, origin.currency)
	)
		errors.amount = ARS_WHOLE_MESSAGE;

	if (data.type !== 'transfer') {
		if (!category) errors.categoryId = MSG.category;
		else if (
			category.archivedAt &&
			category.id !== keep.categoryId &&
			!keep.archivedOk?.includes(category.id)
		)
			errors.categoryId = MSG.archivedCategory;
		else if (
			(category.kind === 'income' || category.kind === 'outcome') &&
			category.kind !== data.type &&
			category.id !== keep.categoryId
		)
			errors.categoryId = MSG.kindMismatch[category.kind];
		if (Object.keys(errors).length > 0) return { ok: false, errors };
		return {
			ok: true,
			row: { ...base, categoryId: category!.id, destinationAmount: null }
		};
	}

	if (!destination) errors.destinationAccountId = MSG.destination;
	else if (origin && destination.id === origin.id) errors.destinationAccountId = MSG.sameAccount;
	else if (
		destination.archivedAt &&
		!keep.accountIds.includes(destination.id) &&
		!keep.archivedOk?.includes(destination.id)
	)
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
	if (!isValidRate(data.exchangeRate)) return { ok: false, errors: { exchangeRate: MSG.rate } };
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

export type MovementFilterQuery = {
	q: string;
	from: string;
	to: string;
	type: MovementType | '';
	account: string[];
	category: string[];
	currency: Currency | '';
};

/** Pure: normalises URL search params; any invalid value becomes empty/default. */
export function parseMovementFilters(sp: URLSearchParams) {
	const get = (k: string) => sp.get(k) ?? '';
	const day = (k: string) => (validDay(get(k)) ? get(k) : '');
	const uuids = (k: string) => [...new Set(sp.getAll(k).filter(isUuid))];
	let from = day('from');
	let to = day('to');
	if (from && to && from > to) [from, to] = [to, from];
	const q = get('q').trim();
	const query: MovementFilterQuery = {
		q: q.length > QUERY_MAX_LENGTH ? '' : q,
		from,
		to,
		type: MOVEMENT_TYPES.find((t) => t === get('type')) ?? '',
		account: uuids('account'),
		category: uuids('category'),
		currency: CURRENCIES.find((c) => c === get('currency')) ?? ''
	};
	const n = Number(get('page'));
	const page = Number.isSafeInteger(n) && n >= 1 && n <= MAX_PAGE ? n : 1;
	// An account filter fixes the currency (its own), so currency only counts as active without one.
	const { account, category, ...scalars } = query;
	const shown: Record<string, string> = scalars;
	const activeCount =
		Object.values({
			...shown,
			currency: account.length ? '' : query.currency,
			// Desde + Hasta are one range selection in the UI.
			to: query.from ? '' : query.to
		}).filter(Boolean).length +
		(account.length ? 1 : 0) +
		(category.length ? 1 : 0);
	return { values: shown, accounts: account, categories: category, query, page, activeCount };
}

/**
 * Movimientos defaults to "Este mes" (month start up to today) when the URL has no dates; `all=1` is
 * the explicit way to see every date. Shared by the list and the drawer's count so both agree.
 * `explicitDefault`: the URL spells out the default range, which is not an active filter.
 */
export function applyDefaultRange(
	query: MovementFilterQuery,
	sp: URLSearchParams,
	today = localDay(new Date())
) {
	const monthStart = `${today.slice(0, 7)}-01`;
	const noDates = !query.from && !query.to;
	const allDates = noDates && sp.get('all') === '1';
	return {
		query: noDates && !allDates ? { ...query, from: monthStart, to: today } : query,
		allDates,
		explicitDefault: query.from === monthStart && query.to === today
	};
}
