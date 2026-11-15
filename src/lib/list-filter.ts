import { CURRENCIES, type Currency } from './money';
import { kindFits } from './movement';

/**
 * The accounts/categories list filters from the URL: the search term (trimmed, cut to `qMax`),
 * `archived=1`, and the currency, which falls back to `currencyDefault` (each list keeps its own).
 */
export function parseListFilter<D extends string>(
	sp: URLSearchParams,
	opts: { qMax: number; currencyDefault: D; extra?: readonly D[] }
) {
	const param = sp.get('currency');
	const currency: Currency | D =
		CURRENCIES.find((c) => c === param) ??
		opts.extra?.find((e) => e === param) ??
		opts.currencyDefault;
	return {
		q: (sp.get('q') ?? '').trim().slice(0, opts.qMax),
		archived: sp.get('archived') === '1',
		currency
	};
}

export const matchesQuery = (name: string, q: string) =>
	name.toLowerCase().includes(q.toLowerCase());

/**
 * Whether a list row is shown: it matches the search, is active unless archived ones are listed,
 * and fits the currency and kind filters it has ('' or absent: any).
 */
export const listRowShown = (
	row: { match: boolean; archived: boolean; currency?: string; kind?: string | null },
	f: { archived: boolean; currency?: string; kind?: string }
) =>
	row.match &&
	(f.archived || !row.archived) &&
	(!f.currency || row.currency === f.currency) &&
	(!f.kind || kindFits(row.kind ?? null, f.kind));

/** How many list filters differ from their defaults (the filter button's badge). */
export const activeListFilters = (
	f: { archived: boolean; currency: string; kind?: string },
	currencyDefault: string
) => (f.kind ? 1 : 0) + (f.currency !== currencyDefault ? 1 : 0) + (f.archived ? 1 : 0);
