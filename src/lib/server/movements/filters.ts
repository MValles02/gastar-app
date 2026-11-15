import { DESCRIPTION_MAX_LENGTH } from '$lib/fields';
import { MOVEMENT_TYPES, type MovementType } from '$lib/movement';
import { CURRENCIES, type Currency } from '$lib/money';
import { isUuid } from '../db/util';
import { localDay } from '../month';
import { validDay } from './form';

// A longer search term cannot match any description, so it is dropped.
const QUERY_MAX_LENGTH = DESCRIPTION_MAX_LENGTH;
const MAX_PAGE = 10000;

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
