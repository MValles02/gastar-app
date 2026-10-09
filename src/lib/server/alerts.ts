import { and, inArray } from 'drizzle-orm';
import { toSwatchKey, type SwatchKey } from '../appearance';
import { CURRENCIES, formatMoney, type Currency } from '../money';
import { canAccessCategory } from './access';
import { accountSummary } from './dashboard-queries';
import { db } from './db';
import { categories } from './db/schema';
import { currentMonth, localDay, monthRange } from './month';
import { dueLabel, recurringStatus } from './plan';
import { paidRecurring } from './plan-queries';
import { planView } from './plan-view';

/** An unpaid fixed payment is an alert once it is overdue or due within this many days. */
const DUE_WINDOW_DAYS = 3;

/** Currency name inside alert titles ("Te pasaste del plan en pesos"). */
const CURRENCY_NAME = { ARS: 'pesos', USD: 'dólares' } as const satisfies Record<Currency, string>;

export type AlertItem = {
	id: string;
	title: string;
	body: string;
	/** Payments link straight to the rule's form; plan alerts (null) need the currency switched first. */
	href: string | null;
	kind: 'payment' | 'plan' | 'limit';
	/** Short display name: the rule description, "Plan" or the category name. */
	name: string;
	pill: { label: string; tone: 'over' | 'due' | 'plain' };
	/** Payments only: the rule's amount in minor units of the group's currency. */
	amount: number | null;
	/** Payments: the account name. Plan and limits: "spent de limit" or "Faltan $ N". */
	detail: string;
	/** The category's swatch (payments and limits); null renders neutral. */
	color: SwatchKey | null;
};

/** Swatch key per category id, for the categories the user can access. */
export async function categorySwatches(userId: string, ids: string[]) {
	if (ids.length === 0) return new Map<string, SwatchKey | null>();
	const rows = await db
		.select({ id: categories.id, color: categories.color })
		.from(categories)
		.where(and(canAccessCategory(userId), inArray(categories.id, ids)));
	return new Map(rows.map((r) => [r.id, toSwatchKey(r.color)]));
}

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
	const currencies = CURRENCIES.filter((c) => summary.some((s) => s.currency === c && s.count > 0));

	return Promise.all(
		currencies.map(async (currency: Currency) => {
			const { active, summary: plan } = await planView(userId, currency, now);
			const items: AlertItem[] = [];
			const swatches = await categorySwatches(userId, [
				...active.map((r) => r.categoryId),
				...(plan?.limits.map((l) => l.categoryId) ?? [])
			]);

			active
				.filter((r) => r.type === 'outcome')
				.map((r) => ({ r, s: recurringStatus(r.dayOfMonth, paidIds.has(r.id), ym, today) }))
				.filter(({ s }) => s.status !== 'paid' && s.daysLeft <= DUE_WINDOW_DAYS)
				.sort((a, b) => a.s.daysLeft - b.s.daysLeft)
				.forEach(({ r, s }) => {
					const label = dueLabel(s.status, s.daysLeft, r.type);
					items.push({
						id: `rule-${r.id}`,
						title: r.description,
						body: `${label} · ${formatMoney(r.amount, currency)} · ${r.accountName}`,
						href: `/movements/new?recurring=${r.id}`,
						kind: 'payment',
						name: r.description,
						pill: {
							label,
							tone: s.status === 'overdue' ? 'over' : s.status === 'today' ? 'due' : 'plain'
						},
						amount: r.amount,
						detail: r.accountName,
						color: swatches.get(r.categoryId) ?? null
					});
				});

			if (plan) {
				const name = CURRENCY_NAME[currency];
				const spentOf = `${formatMoney(plan.spent, currency)} de ${formatMoney(plan.forSpending, currency)}`;
				if (plan.status === 'over')
					items.push({
						id: `plan-${currency}`,
						title: `Te pasaste del plan en ${name}`,
						body:
							plan.forSpending <= 0
								? `Tu ahorro y tus pagos fijos superan tus ingresos por ${formatMoney(-plan.forSpending, currency)}`
								: `Gastado ${spentOf}`,
						href: null,
						kind: 'plan',
						name: 'Plan',
						pill: { label: 'Te pasaste', tone: 'over' },
						amount: null,
						detail:
							plan.forSpending <= 0
								? `Faltan ${formatMoney(-plan.forSpending, currency)}`
								: spentOf,
						color: null
					});
				else if (plan.status === 'warn')
					items.push({
						id: `plan-${currency}`,
						title: `Estás gastando más rápido de lo planeado en ${name}`,
						body: `Gastado ${spentOf}`,
						href: null,
						kind: 'plan',
						name: 'Plan',
						pill: { label: 'Atención', tone: 'due' },
						amount: null,
						detail: spentOf,
						color: null
					});
				for (const l of plan.limits.filter((l) => l.over)) {
					const detail = `${formatMoney(l.spent, currency)} de ${formatMoney(l.amount, currency)}`;
					items.push({
						id: `limit-${currency}-${l.categoryId}`,
						title: `${l.name} superó su límite`,
						body: detail,
						href: null,
						kind: 'limit',
						name: l.name,
						pill: { label: 'Te pasaste', tone: 'over' },
						amount: null,
						detail,
						color: swatches.get(l.categoryId) ?? null
					});
				}
			}
			return { currency, items };
		})
	);
}
