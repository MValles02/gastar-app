import { fail } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';
import {
	accountSummary,
	categorySums,
	originTypeSums,
	recentMovements,
	transfersInSum
} from '$lib/server/dashboard-queries';
import { monthNet, toRecentItem, topCategories, totalBalance } from '$lib/server/dashboard';
import { dateLabel, monthLabel, monthRange, parseMonth, shiftMonth } from '$lib/server/month';

const isCurrency = (v: unknown): v is 'ARS' | 'USD' => v === 'ARS' || v === 'USD';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const raw = cookies.get('dashboard_currency');
	const currency = isCurrency(raw) ? raw : 'ARS';
	const now = new Date();
	const value = parseMonth(url.searchParams.get('month'), now);
	const range = monthRange(value);

	const [summary, allSums, inSum, monthSums, cats, recent] = await Promise.all([
		accountSummary(userId),
		originTypeSums(userId, currency),
		transfersInSum(userId, currency),
		originTypeSums(userId, currency, range),
		categorySums(userId, currency, range),
		recentMovements(userId, currency)
	]);

	const current = summary.find((s) => s.currency === currency);

	return {
		currency,
		hasAnyAccount: summary.some((s) => s.count > 0),
		hasCurrencyAccount: (current?.count ?? 0) > 0,
		totalBalance: totalBalance(current?.initial ?? 0, allSums, inSum[0]?.amount ?? 0),
		month: {
			value,
			label: monthLabel(value),
			prev: shiftMonth(value, -1),
			next: shiftMonth(value, 1)
		},
		monthNet: monthNet(monthSums),
		topCategories: topCategories(cats),
		recent: recent.map((r) => {
			const { occurredAt, ...item } = toRecentItem(r, currency);
			return { ...item, dateLabel: dateLabel(occurredAt) };
		})
	};
};

export const actions: Actions = {
	currency: async ({ request, cookies }) => {
		const value = (await request.formData()).get('currency');
		if (!isCurrency(value)) return fail(400, { error: 'Moneda inválida.' });
		cookies.set('dashboard_currency', value, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			sameSite: 'lax',
			httpOnly: true,
			secure: !dev
		});
		return { currency: value };
	}
};
