import type { PageServerLoad } from './$types';
import {
	accountSummary,
	categorySums,
	originTypeSums,
	recentMovements,
	transfersInSum
} from '$lib/server/dashboard-queries';
import { monthNet, toRecentItem, topCategories, totalBalance } from '$lib/server/dashboard';
import { parseCurrencyPref } from '$lib/server/currency-pref';
import { currentMonth, dateLabel, monthLabel, monthRange } from '$lib/server/month';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const userId = locals.user!.id;
	const pref = parseCurrencyPref(cookies.get('currency'));
	const now = new Date();
	const value = currentMonth(now);
	const range = monthRange(value);

	const summary = await accountSummary(userId);
	const hasAnyAccount = summary.some((s) => s.count > 0);
	const wanted = pref === 'both' ? (['ARS', 'USD'] as const) : ([pref] as const);
	const currencies = wanted.filter((c) => summary.some((s) => s.currency === c && s.count > 0));

	const [blocks, recent] = await Promise.all([
		Promise.all(
			currencies.map(async (currency) => {
				const [allSums, inSum, monthSums, cats] = await Promise.all([
					originTypeSums(userId, currency),
					transfersInSum(userId, currency),
					originTypeSums(userId, currency, range),
					categorySums(userId, currency, range)
				]);
				const initial = summary.find((s) => s.currency === currency)?.initial ?? 0;
				return {
					currency,
					balance: totalBalance(initial, allSums, inSum[0]?.amount ?? 0),
					monthNet: monthNet(monthSums),
					topCategories: topCategories(cats)
				};
			})
		),
		currencies.length > 0
			? recentMovements(userId, pref === 'both' ? undefined : pref)
			: Promise.resolve([])
	]);

	return {
		pref,
		hasAnyAccount,
		month: { label: monthLabel(value, false) },
		blocks,
		recent: recent.map((r) => {
			const { occurredAt, ...item } = toRecentItem(r, pref === 'both' ? r.accountCurrency : pref);
			return { ...item, dateLabel: dateLabel(occurredAt) };
		})
	};
};
