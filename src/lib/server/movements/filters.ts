import { DESCRIPTION_MAX_LENGTH } from '#lib/constants.ts';
import { FILTER_PARAMS, MOVEMENT_TYPES, type MovementType } from '#lib/movement.ts';
import { CURRENCIES, type Currency } from '#lib/money.ts';
import { MOVEMENTS_MAX_PAGE } from '#lib/server/constants.ts';
import { isUuid } from '../db/util';
import { localDay } from '../month';
import { validDay } from './form';
import { summarizeMovements } from './queries';

// A longer search term cannot match any description, so it is dropped.
const QUERY_MAX_LENGTH = DESCRIPTION_MAX_LENGTH;

export type MovementFilterQuery = {
	q: string;
	from: string;
	to: string;
	type: MovementType | '';
	account: string[];
	category: string[];
	currency: Currency | '';
};

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
	const page = Number.isSafeInteger(n) && n >= 1 && n <= MOVEMENTS_MAX_PAGE ? n : 1;
	const { account, category } = query;
	const shown: Record<string, string> = Object.fromEntries(FILTER_PARAMS.map((k) => [k, query[k]]));
	const activeCount =
		FILTER_PARAMS.filter((k) =>
			// An account filter fixes the currency (its own), so currency only counts as active without one.
			k === 'currency'
				? !account.length && query.currency
				: // Desde + Hasta are one range selection in the UI.
					k === 'to'
					? !query.from && query.to
					: query[k]
		).length +
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

/**
 * The movements query a URL asks for (the list and the drawer's count read it alike): its filters,
 * the default range, and an explicit account filter winning over `?currency=`.
 */
export function movementQueryFromUrl(url: URL, today = localDay(new Date())) {
	const parsed = parseMovementFilters(url.searchParams);
	const {
		query: ranged,
		allDates,
		explicitDefault
	} = applyDefaultRange(parsed.query, url.searchParams, today);
	const filters: Record<string, string> = { ...parsed.values, from: ranged.from, to: ranged.to };
	return {
		query: { ...ranged, currency: ranged.account.length ? ('' as const) : ranged.currency },
		filters,
		allDates,
		page: parsed.page,
		// The default range, implicit or explicit, is not an active filter.
		activeCount: parsed.activeCount - (explicitDefault ? 1 : 0)
	};
}

/** The currency a movements list shows: the selected accounts' common one, else `?currency=`, else none. */
export function filterCurrency(
	query: Pick<MovementFilterQuery, 'account' | 'currency'>,
	accounts: { id: string; currency: Currency }[]
): Currency | undefined {
	// Common currency of the selected accounts (null when none or mixed).
	const selectedCurrencies = new Set(
		accounts.filter((a) => query.account.includes(a.id)).map((a) => a.currency)
	);
	const lockedCurrency: Currency | null =
		selectedCurrencies.size === 1 ? [...selectedCurrencies][0] : null;
	return query.currency || lockedCurrency || undefined;
}

export async function countMovements(userId: string, query: MovementFilterQuery) {
	const rows = await summarizeMovements(userId, query);
	return rows.reduce((a, r) => a + r.count, 0);
}
