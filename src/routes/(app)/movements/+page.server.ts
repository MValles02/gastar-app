import type { PageServerLoad } from './$types';
import { toIconKey, toSwatchKey } from '$lib/appearance';
import { listAccounts } from '$lib/server/accounts-queries';
import { listCategories } from '$lib/server/categories-queries';
import { toRecentItem, type Currency } from '$lib/server/dashboard';
import { parseCurrencyPref } from '$lib/server/currency-pref';
import { dayHeading, localDay, toLocalInput } from '$lib/server/month';
import { parseMovementFilters } from '$lib/server/movements';
import { listMovements, PAGE_SIZE } from '$lib/server/movements-queries';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const userId = locals.user!.id;
	const { values, query: parsed, page, activeCount } = parseMovementFilters(url.searchParams);
	const pref = parseCurrencyPref(cookies.get('currency'));
	// An explicit account filter wins over the global currency selection.
	const query = { ...parsed, currency: parsed.account || pref === 'both' ? ('' as const) : pref };

	const [rows, accountRows, categoryRows] = await Promise.all([
		listMovements(userId, query, page),
		listAccounts(userId, { archived: true }),
		listCategories(userId, { archived: true })
	]);

	const now = new Date();
	const today = localDay(now);
	const filterCurrency: Currency | undefined =
		query.currency || accountRows.find((a) => a.id === query.account)?.currency;

	const hasNext = rows.length > PAGE_SIZE;
	const groups: {
		day: string;
		heading: string;
		items: (ReturnType<typeof toRecentItem> & { currency: Currency })[];
	}[] = [];
	for (const r of rows.slice(0, PAGE_SIZE)) {
		const day = localDay(r.occurredAt);
		const currency = filterCurrency ?? r.accountCurrency;
		let group = groups.at(-1);
		if (group?.day !== day) {
			group = { day, heading: dayHeading(day, today), items: [] };
			groups.push(group);
		}
		group.items.push({ ...toRecentItem(r, currency), currency });
	}

	return {
		filters: values,
		groups,
		accounts: [
			{ id: '', name: 'Todas las cuentas', icon: 'accounts' as const, color: null },
			...accountRows.map((a) => ({
				id: a.id,
				name: a.name,
				icon: toIconKey(a.icon),
				color: toSwatchKey(a.color),
				meta: a.currency,
				archived: a.archivedAt !== null
			}))
		],
		categories: [
			{ id: '', name: 'Todas las categorías', icon: 'categories' as const, color: null },
			...categoryRows.map((c) => ({
				id: c.id,
				name: c.name,
				icon: 'categories' as const,
				color: toSwatchKey(c.color),
				archived: c.archivedAt !== null
			}))
		],
		now: toLocalInput(now),
		page,
		hasNext,
		activeCount
	};
};
