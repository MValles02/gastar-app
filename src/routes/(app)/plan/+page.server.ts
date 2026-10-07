import type { PageServerLoad } from './$types';
import { singleCurrency } from '$lib/server/currency-pref';
import { accountSummary } from '$lib/server/dashboard-queries';
import { currentMonth, localDay, monthRange } from '$lib/server/month';
import { dueLabel, isRecurringActive, recurringStatus } from '$lib/server/plan';
import { paidRecurring } from '$lib/server/plan-queries';
import { planView } from '$lib/server/plan-view';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const currency = singleCurrency(cookies.get('currency'));
	const saved = url.searchParams.get('saved') === '1';
	const planSaved = url.searchParams.get('planSaved') === '1';
	const summary = await accountSummary(userId);
	if (!summary.some((s) => s.currency === currency && s.count > 0))
		return { currency, saved, planSaved, hasCurrency: false as const };

	const now = new Date();
	const ym = currentMonth(now);
	const today = localDay(now);
	// `rules` and `active` are server-only (see planView); the rest of the view goes to the client.
	const [paid, { rules, active: activeRules, ...plan }] = await Promise.all([
		paidRecurring(userId, monthRange(ym)),
		planView(userId, currency, now)
	]);
	const paidIds = new Set(paid.map((p) => p.recurringId));

	const active = activeRules.map((r) => {
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
		planSaved,
		hasCurrency: true as const,
		plan,
		incomes: active.filter((r) => r.type === 'income'),
		outcomes: active.filter((r) => r.type === 'outcome'),
		inactive
	};
};
