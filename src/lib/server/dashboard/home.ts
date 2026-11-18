import { categoryLook, type CategoryIconKey, type SwatchKey } from '#lib/appearance.ts';
import { CURRENCY_NAME, type Currency } from '#lib/money.ts';
import { accountSummary } from '../accounts/queries';
import { hasAccounts, monthNet, totalBalance } from '../accounts/balance';
import { rankSpending } from '../categories/spending';
import { toRecentItem } from '../movements/recent';
import { categorySums, originTypeSums, recentMovements, transfersInSum } from './queries';
import { hasAnyMovement } from '../movements/queries';
import { hasAnyPlan } from '../plan/queries';
import { currentMonth, dayHeading, localDay, monthLabel, monthRange } from '../month';
import { planView } from '../plan/month-plan';
import { importsPending } from '../imports/connections';

/** How many categories the home screen ranks. */
const TOP_CATEGORIES = 3;

export function topCategories(
	rows: { id: string; name: string; outcome: number; income: number }[]
): { id: string; name: string; net: number; share: number }[] {
	const { top, total } = rankSpending(rows, TOP_CATEGORIES);
	return top.map((r) => ({ id: r.id, name: r.name, net: r.net, share: r.net / total }));
}

type TopCategory = ReturnType<typeof topCategories>[number] & {
	color: SwatchKey | null;
	icon: CategoryIconKey | null;
};

export async function homeView(userId: string, currency: Currency, now: Date) {
	const value = currentMonth(now);
	const range = monthRange(value);
	const [summary, anyMovement, anyPlan, mpPendingCount] = await Promise.all([
		accountSummary(userId),
		hasAnyMovement(userId),
		hasAnyPlan(userId),
		importsPending(userId)
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
		currencyWord: CURRENCY_NAME[currency],
		/** Pending Mercado Pago items; null when not linked or the feature is off. */
		mpPending: mpPendingCount
	};

	if (!hasCurrencyAccount) {
		return {
			...base,
			balance: 0,
			monthNet: 0,
			plan: null,
			topCategories: [] as TopCategory[],
			recent: []
		};
	}

	const [allSums, inSum, monthSums, cats, recent, plan] = await Promise.all([
		originTypeSums(userId, currency),
		transfersInSum(userId, currency),
		originTypeSums(userId, currency, range),
		categorySums(userId, currency, range),
		recentMovements(userId, currency),
		planView(userId)
	]);

	const looks = new Map(cats.map((c) => [c.id, categoryLook(c)]));

	return {
		...base,
		balance: totalBalance(row?.initial ?? 0, allSums, inSum[0]?.amount ?? 0),
		monthNet: monthNet(monthSums),
		plan: {
			endedMonthName: plan.endedMonthName,
			statusLabel: plan.statusLabel,
			summary: plan.summary && {
				available: plan.summary.available,
				perDay: plan.summary.perDay,
				daysLeft: plan.summary.daysLeft,
				status: plan.summary.status
			}
		},
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
