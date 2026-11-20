import type { PageServerLoad } from './$types';
import { preferredCurrency } from '#lib/server/currency-pref.ts';
import { hasAccounts } from '#lib/server/accounts/balance.ts';
import { accountSummary } from '#lib/server/accounts/queries.ts';
import { biggestOutcome, categorySums, monthlyFlows } from '#lib/server/dashboard/queries.ts';
import {
	dateLabel,
	elapsedDays,
	lastMonths,
	localDay,
	monthLabel,
	monthNav,
	monthParam,
	monthRange,
	shortMonth
} from '#lib/server/month.ts';
import { requireUser } from '#lib/server/guards.ts';
import { categorySlices } from '#lib/server/categories/spending.ts';

const FLOW_MONTHS = 6;
/** Categories listed as their own row; the rest are summed into "Otros". */
const TOP_CATEGORIES = 4;

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = requireUser(locals).id;
	const currency = preferredCurrency(cookies);
	const now = new Date();
	// A future month reads as the current one.
	const ym = monthParam(url, { clamp: true }, now);
	const nav = monthNav(ym, now);

	const months = lastMonths(ym, FLOW_MONTHS);
	const range = monthRange(ym);
	const [summary, flows, cats, [biggest]] = await Promise.all([
		accountSummary(userId),
		monthlyFlows(userId, currency, { start: monthRange(months[0]).start, end: range.end }),
		categorySums(userId, currency, range),
		biggestOutcome(userId, currency, range)
	]);
	if (!hasAccounts(summary, currency)) return { currency, nav, hasCurrency: false as const };

	const bars = months.map((m) => {
		const f = flows.find((x) => x.month === m);
		return {
			ym: m,
			label: shortMonth(m),
			name: monthLabel(m, false),
			income: f?.income ?? 0,
			outcome: f?.outcome ?? 0
		};
	});
	const month = bars[bars.length - 1];

	const days = elapsedDays(ym, localDay(now));
	return {
		currency,
		nav,
		hasCurrency: true as const,
		bars,
		income: month.income,
		outcome: month.outcome,
		net: month.income - month.outcome,
		dailyAverage: Math.round(month.outcome / days),
		days,
		slices: categorySlices(cats, TOP_CATEGORIES),
		biggest: biggest
			? {
					id: biggest.id,
					description: biggest.description,
					amount: biggest.amount,
					categoryName: biggest.categoryName,
					date: dateLabel(biggest.occurredAt)
				}
			: null
	};
};
