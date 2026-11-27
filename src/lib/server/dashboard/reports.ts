import type { Currency } from '#lib/money.ts';
import { REPORTS_FLOW_MONTHS, REPORTS_TOP_CATEGORIES } from '#lib/server/constants.ts';
import { hasAnyAccount } from '../accounts/queries';
import { biggestOutcome, categorySums, monthlyFlows } from './queries';
import { dateLabel, elapsedDays, lastMonths, localDay, monthRange, shortMonth } from '../month';
import { categorySlices } from '../categories/spending';

/** The reports page data for one currency and month (everything but `currency` and `nav`). */
export async function reportView(userId: string, currency: Currency, ym: string, now: Date) {
	const months = lastMonths(ym, REPORTS_FLOW_MONTHS);
	const range = monthRange(ym);
	const [anyAccount, flows, cats, [biggest]] = await Promise.all([
		hasAnyAccount(userId, currency),
		monthlyFlows(userId, currency, { start: monthRange(months[0]).start, end: range.end }),
		categorySums(userId, currency, range),
		biggestOutcome(userId, currency, range)
	]);
	if (!anyAccount) return { hasCurrency: false as const };

	const bars = months.map((m) => {
		const f = flows.find((x) => x.month === m);
		return {
			ym: m,
			label: shortMonth(m),
			income: f?.income ?? 0,
			outcome: f?.outcome ?? 0
		};
	});
	const month = bars[bars.length - 1];

	const days = elapsedDays(ym, localDay(now));
	return {
		hasCurrency: true as const,
		bars,
		income: month.income,
		outcome: month.outcome,
		net: month.income - month.outcome,
		dailyAverage: Math.round(month.outcome / days),
		days,
		slices: categorySlices(cats, REPORTS_TOP_CATEGORIES),
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
}
