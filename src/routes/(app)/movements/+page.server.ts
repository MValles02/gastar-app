import type { PageServerLoad } from './$types';
import { listAccounts } from '#lib/server/accounts/queries.ts';
import { listCategories } from '#lib/server/categories/queries.ts';
import type { Currency } from '#lib/money.ts';
import { toRecentItem } from '#lib/server/movements/recent.ts';
import { dayHeading, localDay, monthHeading } from '#lib/server/month.ts';
import { countMovements, movementQueryFromUrl } from '#lib/server/movements/filters.ts';
import { listMovements, PAGE_SIZE } from '#lib/server/movements/queries.ts';
import { accountItem, categoryItem } from '#lib/server/movements/pickers.ts';
import { requireUser } from '#lib/server/guards.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const today = localDay(new Date());
	const { query, filters, allDates, page, activeCount } = movementQueryFromUrl(url, today);
	const { account: accountIds, category: categoryIds } = query;

	const [rows, accountRows, categoryRows, count] = await Promise.all([
		listMovements(userId, query, page),
		listAccounts(userId, { archived: true }),
		listCategories(userId, { archived: true }),
		activeCount > 0 ? countMovements(userId, query) : null
	]);

	// Filter/search active: total matches.
	const summary = count !== null ? { count } : null;

	// Common currency of the selected accounts (null when none or mixed).
	const selectedCurrencies = new Set(
		accountRows.filter((a) => accountIds.includes(a.id)).map((a) => a.currency)
	);
	const lockedCurrency: Currency | null =
		selectedCurrencies.size === 1 ? [...selectedCurrencies][0] : null;
	const filterCurrency: Currency | undefined = query.currency || lockedCurrency || undefined;

	const hasNext = rows.length > PAGE_SIZE;
	type Item = ReturnType<typeof toRecentItem> & {
		currency: Currency;
		secondary: { cents: number; currency: Currency } | null;
	};
	const months: {
		ym: string;
		label: string;
		days: { day: string; heading: string; items: Item[] }[];
	}[] = [];
	for (const r of rows.slice(0, PAGE_SIZE)) {
		const day = localDay(r.occurredAt);
		const ym = day.slice(0, 7);
		const currency = filterCurrency ?? r.accountCurrency;
		let month = months.at(-1);
		if (month?.ym !== ym) {
			month = { ym, label: monthHeading(ym), days: [] };
			months.push(month);
		}
		let group = month.days.at(-1);
		if (group?.day !== day) {
			group = { day, heading: dayHeading(day, today, true), items: [] };
			month.days.push(group);
		}
		// Cross-currency transfer shown in its origin currency: the destination amount goes underneath.
		const secondary =
			r.type === 'transfer' &&
			currency === r.accountCurrency &&
			r.destinationCurrency &&
			r.destinationCurrency !== currency &&
			r.destinationAmount !== null
				? { cents: r.destinationAmount, currency: r.destinationCurrency }
				: null;
		group.items.push({ ...toRecentItem(r, currency), currency, secondary });
	}

	return {
		filters,
		allDates,
		accountIds,
		categoryIds,
		months,
		summary,
		accounts: [
			{ id: '', name: 'Todas', icon: 'accounts' as const, color: null },
			...accountRows.map(accountItem)
		],
		categories: [
			{ id: '', name: 'Todas', icon: 'categories' as const, color: null },
			...categoryRows.map(categoryItem)
		],
		page,
		hasNext,
		activeCount
	};
};
