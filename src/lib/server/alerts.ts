import { formatMoney } from '../money';
import type { Currency } from './dashboard';
import { accountSummary } from './dashboard-queries';
import { currentMonth, localDay, monthRange } from './month';
import { dueLabel, recurringStatus } from './plan';
import { paidRecurring } from './plan-queries';
import { planView } from './plan-view';

/** An unpaid fixed payment is an alert once it is overdue or due within this many days. */
const DUE_WINDOW_DAYS = 3;

export type AlertItem = {
	id: string;
	title: string;
	body: string;
	/** Payments link straight to the rule's form; plan alerts (null) need the currency switched first. */
	href: string | null;
};

/**
 * Alerts per currency that has accounts, worked out from existing data (nothing is stored).
 * Payments first (overdue, then by due day), then the plan, then category limits. Never sums across currencies.
 */
export async function alerts(userId: string, now = new Date()) {
	const ym = currentMonth(now);
	const today = localDay(now);
	const [summary, paid] = await Promise.all([
		accountSummary(userId),
		paidRecurring(userId, monthRange(ym))
	]);
	const paidIds = new Set(paid.map((p) => p.recurringId));
	const currencies = (['ARS', 'USD'] as const).filter((c) =>
		summary.some((s) => s.currency === c && s.count > 0)
	);

	return Promise.all(
		currencies.map(async (currency: Currency) => {
			const { active, summary: plan } = await planView(userId, currency, now);
			const items: AlertItem[] = [];

			active
				.filter((r) => r.type === 'outcome')
				.map((r) => ({ r, s: recurringStatus(r.dayOfMonth, paidIds.has(r.id), ym, today) }))
				.filter(({ s }) => s.status !== 'paid' && s.daysLeft <= DUE_WINDOW_DAYS)
				.sort((a, b) => a.s.daysLeft - b.s.daysLeft)
				.forEach(({ r, s }) =>
					items.push({
						id: `rule-${r.id}`,
						title: r.description,
						body: `${dueLabel(s.status, s.daysLeft, r.type)} · ${formatMoney(r.amount, currency)} · ${r.accountName}`,
						href: `/movements/new?recurring=${r.id}`
					})
				);

			if (plan) {
				const name = currency === 'ARS' ? 'pesos' : 'dólares';
				if (plan.status === 'over')
					items.push({
						id: `plan-${currency}`,
						title: `Te pasaste del plan en ${name}`,
						body:
							plan.forSpending <= 0
								? `Tu ahorro y tus pagos fijos superan tus ingresos por ${formatMoney(-plan.forSpending, currency)}`
								: `Gastado ${formatMoney(plan.spent, currency)} de ${formatMoney(plan.forSpending, currency)}`,
						href: null
					});
				else if (plan.status === 'warn')
					items.push({
						id: `plan-${currency}`,
						title: `Estás gastando más rápido de lo planeado en ${name}`,
						body: `Gastado ${formatMoney(plan.spent, currency)} de ${formatMoney(plan.forSpending, currency)}`,
						href: null
					});
				for (const l of plan.limits.filter((l) => l.over))
					items.push({
						id: `limit-${currency}-${l.categoryId}`,
						title: `${l.name} superó su límite`,
						body: `${formatMoney(l.spent, currency)} de ${formatMoney(l.amount, currency)}`,
						href: null
					});
			}
			return { currency, items };
		})
	);
}
