import type { PageServerLoad } from './$types';
import { singleCurrency } from '$lib/server/currency-pref';
import { accountSummary } from '$lib/server/dashboard-queries';
import { currentMonth, localDay, monthRange } from '$lib/server/month';
import { dueLabel, isRecurringActive, recurringStatus } from '$lib/server/plan';
import { listRecurring, paidRecurring } from '$lib/server/plan-queries';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const currency = singleCurrency(cookies.get('currency'));
	const saved = url.searchParams.get('saved') === '1';
	const summary = await accountSummary(userId);
	if (!summary.some((s) => s.currency === currency && s.count > 0))
		return { currency, saved, hasCurrency: false as const };

	const now = new Date();
	const ym = currentMonth(now);
	const today = localDay(now);
	const [rules, paid] = await Promise.all([
		listRecurring(userId, currency),
		paidRecurring(userId, monthRange(ym))
	]);
	const paidIds = new Set(paid.map((p) => p.recurringId));

	const active = rules.filter(isRecurringActive).map((r) => {
		const s = recurringStatus(r.dayOfMonth, paidIds.has(r.id), ym, today);
		return {
			id: r.id,
			type: r.type,
			description: r.description,
			amount: r.amount,
			accountName: r.accountName,
			day: r.dayOfMonth,
			status: s.status,
			label: dueLabel(s.status, s.daysLeft, r.type)
		};
	});
	const inactive = rules
		.filter((r) => !isRecurringActive(r))
		.map((r) => ({
			id: r.id,
			type: r.type,
			description: r.description,
			amount: r.amount,
			accountName: r.accountName,
			day: r.dayOfMonth,
			reason: r.archivedAt
				? 'Archivado'
				: r.accountArchivedAt
					? 'Cuenta archivada'
					: 'Categoría archivada'
		}));

	return {
		currency,
		saved,
		hasCurrency: true as const,
		incomes: active.filter((r) => r.type === 'income'),
		outcomes: active.filter((r) => r.type === 'outcome'),
		inactive
	};
};
