import type { PageServerLoad } from './$types';
import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import { accountOption } from '$lib/server/account-options';
import { listAccounts } from '$lib/server/accounts-queries';
import { listCategories } from '$lib/server/categories-queries';
import type { Currency } from '$lib/money';
import { toRecentItem } from '$lib/server/dashboard';
import { dayHeading, localDay, monthHeading } from '$lib/server/month';
import { applyDefaultRange, parseMovementFilters } from '$lib/server/movements';
import { listMovements, PAGE_SIZE, summarizeMovements } from '$lib/server/movements-queries';
import { requireUser } from '$lib/server/require-user';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const {
		values,
		accounts: accountIds,
		categories: categoryIds,
		query: base,
		page,
		activeCount: parsedCount
	} = parseMovementFilters(url.searchParams);
	const today = localDay(new Date());
	const {
		query: parsed,
		allDates,
		explicitDefault
	} = applyDefaultRange(base, url.searchParams, today);
	// The default range, implicit or explicit, is not an active filter.
	const activeCount = parsedCount - (explicitDefault ? 1 : 0);
	// An explicit account filter wins over ?currency=.
	const query = { ...parsed, currency: accountIds.length ? ('' as const) : parsed.currency };

	const [rows, accountRows, categoryRows, summaryRows] = await Promise.all([
		listMovements(userId, query, page),
		listAccounts(userId, { archived: true }),
		listCategories(userId, { archived: true }),
		activeCount > 0 ? summarizeMovements(userId, query) : []
	]);

	// Filter/search active: total matches.
	const summary = activeCount > 0 ? { count: summaryRows.reduce((a, r) => a + r.count, 0) } : null;

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
		filters: { ...values, from: parsed.from, to: parsed.to } as Record<string, string>,
		allDates,
		accountIds,
		categoryIds,
		lockedCurrency,
		months,
		summary,
		accounts: [
			{ id: '', name: 'Todas', icon: 'accounts' as const, color: null },
			...accountRows.map((a) => ({
				...accountOption(a),
				meta: a.currency,
				archived: a.archivedAt !== null
			}))
		],
		categories: [
			{ id: '', name: 'Todas', icon: 'categories' as const, color: null },
			...categoryRows.map((c) => ({
				id: c.id,
				name: c.name,
				icon: toCategoryIconKey(c.icon) ?? ('categories' as const),
				color: toSwatchKey(c.color),
				archived: c.archivedAt !== null
			}))
		],
		page,
		hasNext,
		activeCount
	};
};
