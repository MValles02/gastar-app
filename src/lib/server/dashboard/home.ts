import { categoryLook, type CategoryIconKey, type SwatchKey } from '#lib/appearance.ts';
import type { Currency } from '#lib/money.ts';
import { signOf, type MovementType } from '#lib/movement.ts';
import { accountSummary } from '../accounts/queries';
import { hasAccounts, monthNet, totalBalance } from '../accounts/balance';
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
	const positive = rows
		.map((r) => ({ id: r.id, name: r.name, net: r.outcome - r.income }))
		.filter((r) => r.net > 0);
	const total = positive.reduce((a, r) => a + r.net, 0);
	return positive
		.sort((a, b) => b.net - a.net || a.name.localeCompare(b.name))
		.slice(0, TOP_CATEGORIES)
		.map((r) => ({ ...r, share: r.net / total }));
}

export type RecentRow = {
	id: string;
	type: MovementType;
	description: string;
	occurredAt: Date;
	amount: number;
	destinationAmount: number | null;
	accountName: string;
	accountCurrency: Currency;
	destinationAccountName: string | null;
	categoryIcon: string | null;
	categoryColor: string | null;
};

export function toRecentItem(row: RecentRow, currency: Currency) {
	const raw =
		row.type === 'transfer' && row.accountCurrency !== currency
			? (row.destinationAmount ?? row.amount)
			: row.amount;
	const sign = signOf(row.type);
	const look = categoryLook({ icon: row.categoryIcon, color: row.categoryColor }, null);
	return {
		id: row.id,
		type: row.type,
		description: row.description,
		accountName: row.accountName,
		categoryIcon: look.icon,
		categoryColor: look.color,
		destinationAccountName: row.destinationAccountName,
		occurredAt: row.occurredAt,
		currency,
		amount: sign === 'negative' ? -raw : raw,
		sign
	};
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
		currencyWord: currency === 'ARS' ? 'pesos' : 'dólares',
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
