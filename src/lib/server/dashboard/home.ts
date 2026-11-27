import { categoryLook, type CategoryIconKey, type SwatchKey } from '#lib/appearance.ts';
import { CURRENCY_NAME, type Currency } from '#lib/money.ts';
import { HOME_TOP_CATEGORIES } from '#lib/server/constants.ts';
import { accountOriginSums, accountSummary, accountTransfersIn } from '../accounts/queries';
import { hasAccounts, monthNet, totalBalance } from '../accounts/balance';
import { rankSpending } from '../categories/spending';
import { toRecentItem } from '../movements/recent';
import { categorySums } from './queries';
import { hasAnyMovement, recentMovements } from '../movements/queries';
import { hasAnyPlan } from '../plan/queries';
import { currentMonth, dayHeading, localDay, monthLabel, monthRange } from '../month';
import { planPace, planView, upcomingBills } from '../plan/month-plan';

export function topCategories(
	rows: { id: string; name: string; outcome: number; income: number }[]
): { id: string; name: string; net: number; share: number }[] {
	const { top, total } = rankSpending(rows, HOME_TOP_CATEGORIES);
	return top.map((r) => ({ id: r.id, name: r.name, net: r.net, share: r.net / total }));
}

type TopCategory = ReturnType<typeof topCategories>[number] & {
	color: SwatchKey | null;
	icon: CategoryIconKey | null;
};

export async function homeView(userId: string, currency: Currency, now: Date) {
	const value = currentMonth(now);
	const range = monthRange(value);
	const [summary, anyMovement, anyPlan] = await Promise.all([
		accountSummary(userId),
		hasAnyMovement(userId),
		hasAnyPlan(userId)
	]);
	const hasAnyAccount = hasAccounts(summary);
	const row = summary.find((s) => s.currency === currency);
	const hasCurrencyAccount = hasAccounts(summary, currency);
	const hasMovement = hasAnyAccount && anyMovement;
	const hasPlan = hasAnyAccount && anyPlan;
	const base = {
		currency,
		hasAnyAccount,
		hasCurrencyAccount,
		monthName: monthLabel(value, false).toLowerCase(),
		/** Done state of the first-run checklist steps. */
		steps: { account: hasAnyAccount, movement: hasMovement, plan: hasPlan },
		firstRunDone: hasAnyAccount && hasMovement && hasPlan,
		currencyWord: CURRENCY_NAME[currency]
	};

	if (!hasCurrencyAccount) {
		return {
			...base,
			balance: 0,
			monthNet: 0,
			plan: null,
			bills: null,
			topCategories: [] as TopCategory[],
			recent: []
		};
	}

	const [allSums, inSum, monthSums, cats, recent, plan, pace, bills] = await Promise.all([
		accountOriginSums(userId, { currency }),
		accountTransfersIn(userId, { currency }),
		accountOriginSums(userId, { currency, range }),
		categorySums(userId, currency, range),
		recentMovements(userId, currency),
		planView(userId),
		planPace(userId),
		upcomingBills(userId, currency)
	]);

	const looks = new Map(cats.map((c) => [c.id, categoryLook(c)]));

	return {
		...base,
		balance: totalBalance(
			row?.initial ?? 0,
			allSums,
			inSum.reduce((n, t) => n + t.amount, 0)
		),
		monthNet: monthNet(monthSums),
		plan: {
			endedMonthName: plan.endedMonthName,
			statusLabel: plan.statusLabel,
			pace,
			summary: plan.summary && {
				available: plan.summary.available,
				perDay: plan.summary.perDay,
				daysLeft: plan.summary.daysLeft,
				status: plan.summary.status
			}
		},
		bills,
		topCategories: topCategories(cats).map((c) => ({
			...c,
			color: looks.get(c.id)?.color ?? null,
			icon: looks.get(c.id)?.icon ?? null
		})),
		recent: recent.map((r) => {
			const { occurredAt, ...item } = toRecentItem(r, currency);
			return { ...item, dateLabel: dayHeading(localDay(occurredAt), localDay(now), true) };
		})
	};
}
