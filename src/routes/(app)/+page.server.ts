import type { PageServerLoad } from './$types';
import {
	accountSummary,
	categorySums,
	originTypeSums,
	recentMovements,
	transfersInSum
} from '$lib/server/dashboard-queries';
import { monthNet, toRecentItem, topCategories, totalBalance } from '$lib/server/dashboard';
import { singleCurrency } from '$lib/server/currency-pref';
import { currentMonth, dateLabel, monthLabel, monthRange } from '$lib/server/month';
import { planView } from '$lib/server/plan-view';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const userId = locals.user!.id;
	const currency = singleCurrency(cookies.get('currency'));
	const now = new Date();
	const value = currentMonth(now);
	const range = monthRange(value);

	const summary = await accountSummary(userId);
	const hasAnyAccount = summary.some((s) => s.count > 0);
	const row = summary.find((s) => s.currency === currency);
	const hasCurrencyAccount = (row?.count ?? 0) > 0;
	const base = {
		currency,
		hasAnyAccount,
		hasCurrencyAccount,
		month: { label: monthLabel(value, false) }
	};

	if (!hasCurrencyAccount) {
		return {
			...base,
			balance: 0,
			monthNet: 0,
			plan: null,
			topCategories: [] as ReturnType<typeof topCategories>,
			recent: []
		};
	}

	const [allSums, inSum, monthSums, cats, recent, plan] = await Promise.all([
		originTypeSums(userId, currency),
		transfersInSum(userId, currency),
		originTypeSums(userId, currency, range),
		categorySums(userId, currency, range),
		recentMovements(userId, currency),
		planView(userId, currency, now)
	]);

	return {
		...base,
		balance: totalBalance(row?.initial ?? 0, allSums, inSum[0]?.amount ?? 0),
		monthNet: monthNet(monthSums),
		plan: {
			monthName: plan.monthName,
			endedMonthName: plan.endedMonthName,
			statusLabel: plan.statusLabel,
			summary: plan.summary && {
				available: plan.summary.available,
				perDay: plan.summary.perDay,
				daysLeft: plan.summary.daysLeft,
				status: plan.summary.status
			}
		},
		topCategories: topCategories(cats),
		recent: recent.map((r) => {
			const { occurredAt, ...item } = toRecentItem(r, currency);
			return { ...item, dateLabel: dateLabel(occurredAt) };
		})
	};
};
