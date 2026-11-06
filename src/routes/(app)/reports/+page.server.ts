import type { PageServerLoad } from './$types';
import { toCategoryIconKey, toSwatchKey, type CategoryIconKey } from '$lib/appearance';
import { preferredCurrency } from '$lib/server/currency-pref';
import { hasAccountsIn } from '$lib/server/dashboard';
import { categorySums } from '$lib/server/dashboard-queries';
import { accountSummaryOnce } from '$lib/server/plan-view';
import {
	currentMonth,
	dateLabel,
	elapsedDays,
	lastMonths,
	localDay,
	monthLabel,
	monthRange,
	parseMonth,
	shiftMonth,
	shortMonth
} from '$lib/server/month';
import { biggestOutcome, monthlyFlows } from '$lib/server/reports-queries';

/** Months in the flow chart, ending at the selected one. */
const FLOW_MONTHS = 6;
/** Categories listed as their own row; the rest are summed into "Otros". */
const TOP_CATEGORIES = 4;

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const currency = preferredCurrency(cookies);
	const now = new Date();
	const current = currentMonth(now);
	const raw = parseMonth(url.searchParams.get('month'), now);
	const ym = raw > current ? current : raw;
	const nav = {
		ym,
		label: monthLabel(ym),
		prev: shiftMonth(ym, -1),
		next: shiftMonth(ym, 1),
		isCurrent: ym >= current
	};

	const months = lastMonths(ym, FLOW_MONTHS);
	const range = monthRange(ym);
	const [summary, flows, cats, [biggest]] = await Promise.all([
		accountSummaryOnce(userId),
		monthlyFlows(userId, currency, { start: monthRange(months[0]).start, end: range.end }),
		categorySums(userId, currency, range),
		biggestOutcome(userId, currency, range)
	]);
	if (!hasAccountsIn(summary, currency)) return { currency, nav, hasCurrency: false as const };

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

	const days = Math.max(elapsedDays(ym, localDay(now)), 1);
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
		slices: categorySlices(cats),
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

type CategorySum = {
	id: string;
	name: string;
	color: string | null;
	icon: string | null;
	outcome: number;
	income: number;
};

/** Net spending per category (integer cents), the top TOP_CATEGORIES plus "Otros". */
function categorySlices(cats: CategorySum[]) {
	const spent = cats
		.map((c) => ({
			id: c.id,
			name: c.name,
			color: toSwatchKey(c.color),
			icon: toCategoryIconKey(c.icon) ?? ('categories' as CategoryIconKey | null),
			amount: c.outcome - c.income
		}))
		.filter((c) => c.amount > 0)
		.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'es'));
	const totalSpent = spent.reduce((a, c) => a + c.amount, 0);
	const slices = spent.slice(0, TOP_CATEGORIES);
	const rest = spent.slice(TOP_CATEGORIES).reduce((a, c) => a + c.amount, 0);
	if (rest > 0) slices.push({ id: 'other', name: 'Otros', color: null, icon: null, amount: rest });

	const percents = wholePercents(
		slices.map((s) => s.amount),
		totalSpent
	);
	return slices.map((s, i) => ({ ...s, percent: percents[i] }));
}

/** Largest-remainder rounding on integer cents so the shown percentages sum to 100. */
function wholePercents(amounts: number[], total: number): number[] {
	const percents = amounts.map((a) => Math.floor((a * 100) / total));
	let left = amounts.length > 0 ? 100 - percents.reduce((a, p) => a + p, 0) : 0;
	[...amounts.keys()]
		.sort((i, j) => ((amounts[j] * 100) % total) - ((amounts[i] * 100) % total) || i - j)
		.forEach((i) => {
			if (left-- > 0) percents[i]++;
		});
	return percents;
}
