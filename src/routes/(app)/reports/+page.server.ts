import type { PageServerLoad } from './$types';
import { singleCurrency } from '$lib/server/currency-pref';
import { accountSummary, categorySums } from '$lib/server/dashboard-queries';
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
/** Categories drawn as their own donut slice; the rest are summed into "Otros". */
const DONUT_TOP = 4;

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const currency = singleCurrency(cookies.get('currency'));
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

	const summary = await accountSummary(userId);
	if (!summary.some((s) => s.currency === currency && s.count > 0))
		return { currency, nav, hasCurrency: false as const };

	const months = lastMonths(ym, FLOW_MONTHS);
	const range = monthRange(ym);
	const [flows, cats, [biggest]] = await Promise.all([
		monthlyFlows(userId, currency, { start: monthRange(months[0]).start, end: range.end }),
		categorySums(userId, currency, range),
		biggestOutcome(userId, currency, range)
	]);

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

	// Donut: net spending per category (integer cents), top DONUT_TOP plus "Otros".
	const spent = cats
		.map((c) => ({ id: c.id, name: c.name, amount: c.outcome - c.income }))
		.filter((c) => c.amount > 0)
		.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'es'));
	const totalSpent = spent.reduce((a, c) => a + c.amount, 0);
	const slices = spent.slice(0, DONUT_TOP);
	const rest = spent.slice(DONUT_TOP).reduce((a, c) => a + c.amount, 0);
	if (rest > 0) slices.push({ id: 'other', name: 'Otros', amount: rest });

	// Largest-remainder rounding on integer cents so the shown percentages sum to 100.
	const percents = slices.map((s) => Math.floor((s.amount * 100) / totalSpent));
	let left = slices.length > 0 ? 100 - percents.reduce((a, p) => a + p, 0) : 0;
	[...slices.keys()]
		.sort(
			(i, j) =>
				((slices[j].amount * 100) % totalSpent) - ((slices[i].amount * 100) % totalSpent) || i - j
		)
		.forEach((i) => {
			if (left-- > 0) percents[i]++;
		});

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
		slices: slices.map((s, i) => ({ ...s, share: s.amount / totalSpent, percent: percents[i] })),
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
