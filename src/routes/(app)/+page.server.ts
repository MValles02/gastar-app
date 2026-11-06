import type { CategoryIconKey, SwatchKey } from '$lib/appearance';
import type { PageServerLoad } from './$types';
import {
	categorySums,
	hasAnyMovement,
	hasAnyPlan,
	originTypeSums,
	recentMovements,
	transfersInSum
} from '$lib/server/dashboard-queries';
import { monthNet, toRecentItem, topCategories, totalBalance } from '$lib/server/dashboard';
import { preferredCurrency } from '$lib/server/currency-pref';
import { currentMonth, dayHeading, localDay, monthLabel, monthRange } from '$lib/server/month';
import { categorySwatches } from '$lib/server/alerts';
import { toCategoryIconKey } from '$lib/appearance';
import { accountSummaryOnce, planViewOnce } from '$lib/server/plan-view';
import { getImportAccount, pendingImportCount } from '$lib/server/mp-import-queries';
import { mpOauthEnabled } from '$lib/server/mp-oauth';

type TopCategory = ReturnType<typeof topCategories>[number] & {
	color: SwatchKey | null;
	icon: CategoryIconKey | null;
};

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const userId = locals.user!.id;
	const currency = preferredCurrency(cookies);
	const now = new Date();
	const value = currentMonth(now);
	const range = monthRange(value);

	const summary = await accountSummaryOnce(userId);
	const hasAnyAccount = summary.some((s) => s.count > 0);
	const row = summary.find((s) => s.currency === currency);
	const hasCurrencyAccount = (row?.count ?? 0) > 0;

	// Mercado Pago pill: only for a linked user (also while a reconnect is pending); counts both currencies.
	const mpPending = async () =>
		mpOauthEnabled() && (await getImportAccount(userId)) ? await pendingImportCount(userId) : null;
	const [hasMovement, hasPlan, mpPendingCount] = await Promise.all([
		hasAnyAccount ? hasAnyMovement(userId) : false,
		hasAnyAccount ? hasAnyPlan(userId) : false,
		mpPending()
	]);
	const base = {
		currency,
		hasAnyAccount,
		hasCurrencyAccount,
		monthName: monthLabel(value, false).toLowerCase(),
		/** Done state of the first-run checklist steps. */
		steps: { account: hasAnyAccount, movement: hasMovement, plan: hasPlan },
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
		planViewOnce(userId, currency, now)
	]);

	const top = topCategories(cats);
	const swatches = await categorySwatches(
		userId,
		top.map((c) => c.id)
	);
	const icons = new Map(
		cats.map((c) => [c.id, toCategoryIconKey(c.icon) ?? ('categories' as const)])
	);

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
		topCategories: top.map((c) => ({
			...c,
			color: swatches.get(c.id) ?? null,
			icon: icons.get(c.id) ?? null
		})),
		recent: recent.map((r) => {
			const { occurredAt, ...item } = toRecentItem(r, currency);
			return { ...item, dateLabel: dayHeading(localDay(occurredAt), localDay(now), true) };
		})
	};
};
