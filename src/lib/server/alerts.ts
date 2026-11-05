import { and, inArray } from 'drizzle-orm';
import type { StatusTone } from '../status';
import {
	toCategoryIconKey,
	toSwatchKey,
	type CategoryIconKey,
	type SwatchKey
} from '../appearance';
import { CURRENCIES, formatMoney, type Currency } from '../money';
import { canAccessCategory } from './access';
import { hasAccountsIn } from './dashboard';
import { accountSummary } from './dashboard-queries';
import { db } from './db';
import { categories } from './db/schema';
import { currentMonth, localDay, monthRange } from './month';
import { dueLabel, recurringStatus, type RecurringStatus } from './plan';
import { paidRecurring } from './plan-queries';
import { planView } from './plan-view';

/** An unpaid fixed payment is an alert once it is overdue or due within this many days. */
const DUE_WINDOW_DAYS = 3;

export type AlertItem = {
	id: string;
	kind: 'payment' | 'plan' | 'limit';
	/** Short display name: the rule description, "Plan" or the category name. */
	name: string;
	status: { label: string; tone: StatusTone };
	/** One self-explanatory sentence (amounts inside). */
	message: string;
	/** App path the row opens. */
	href: string;
	/** Plan and limit pages read the currency from the cookie: open them through a POST to /currency. */
	switchCurrency: boolean;
	/** The category's icon (payments and limits); null when it has none. */
	icon: CategoryIconKey | null;
	/** The category's swatch (payments and limits); null renders neutral. */
	color: SwatchKey | null;
	/** Payments only: the amount due in minor units (shown on the right); null otherwise. */
	amount: number | null;
	/** Payments only: the account it is paid from; null otherwise. */
	accountName: string | null;
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

type PlanView = Awaited<ReturnType<typeof planView>>;
type ActiveRule = PlanView['active'][number];
type PlanSummary = NonNullable<PlanView['summary']>;
type DueStatus = ReturnType<typeof recurringStatus>;

/** Only unpaid rules inside the alert window reach here: overdue is bad, due today or soon is warning. */
const PAYMENT_TONE = {
	overdue: 'bad',
	today: 'warning',
	upcoming: 'warning',
	paid: 'neutral'
} as const satisfies Record<RecurringStatus, StatusTone>;

/**
 * Alerts per currency that has accounts, worked out from existing data (nothing is stored).
 * Fixed payments first (overdue, then by due day), then the plan, then category limits. Never sums across currencies.
 * Fixed incomes never alert: an unregistered one shows neutrally on /plan ("Esperado el día N").
 */
export async function alerts(userId: string, now = new Date()) {
	const ym = currentMonth(now);
	const today = localDay(now);
	const [summary, paid] = await Promise.all([
		accountSummary(userId),
		paidRecurring(userId, monthRange(ym))
	]);
	const paidIds = new Set(paid.map((p) => p.recurringId));
	const currencies = CURRENCIES.filter((c) => hasAccountsIn(summary, c));

	return Promise.all(
		currencies.map(async (currency: Currency) => {
			const { active, summary: plan } = await planView(userId, currency, now);
			const payments = active
				.filter((r) => r.type !== 'income')
				.map((r) => ({ r, s: recurringStatus(r.dayOfMonth, paidIds.has(r.id), ym, today) }))
				.filter(({ s }) => s.status !== 'paid' && s.daysLeft <= DUE_WINDOW_DAYS)
				.sort((a, b) => a.s.daysLeft - b.s.daysLeft)
				.map(({ r, s }) => paymentAlert(r, s));
			const planAlerts = plan ? [planAlert(plan, currency), ...limitAlerts(plan, currency)] : [];
			const items: AlertItem[] = [...payments, ...planAlerts.filter((a) => a !== null)];
			return { currency, items };
		})
	);
}

const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
const percent = (share: number) => `${Math.round(share * 100)}%`;

function paymentAlert(rule: ActiveRule, due: DueStatus): AlertItem {
	const label = dueLabel(due, rule.type);
	return {
		id: `rule-${rule.id}`,
		kind: 'payment',
		name: rule.description,
		status: { label, tone: PAYMENT_TONE[due.status] },
		message: `${label} · ${rule.accountName}`,
		href: `/plan/recurring/${rule.id}`,
		switchCurrency: false,
		icon: toCategoryIconKey(rule.categoryIcon),
		color: toSwatchKey(rule.categoryColor),
		amount: rule.amount,
		accountName: rule.accountName
	};
}

/** Over or spending too fast; null while the plan is on track. */
function planAlert(plan: PlanSummary, currency: Currency): AlertItem | null {
	const base = {
		id: `plan-${currency}`,
		kind: 'plan',
		name: 'Plan',
		href: '/plan',
		switchCurrency: true,
		icon: null,
		color: null,
		amount: null,
		accountName: null
	} as const;
	if (plan.status === 'over')
		return {
			...base,
			status: { label: 'Te pasaste', tone: 'bad' },
			message:
				plan.forSpending <= 0
					? `Tu ahorro y tus pagos fijos superan tus ingresos por ${formatMoney(-plan.forSpending, currency)}`
					: `Tus gastos y pagos fijos pendientes superan lo que tenés por ${formatMoney(-plan.available, currency)}`
		};
	if (plan.status === 'warn')
		return {
			...base,
			status: { label: 'Vas rápido', tone: 'warning' },
			message: `Gastaste ${percent(plan.spentShare)} de lo que tenés para gastar y quedan ${days(plan.daysLeft)}`
		};
	return null;
}

/** Over the limit, or "Vas rápido" on /plan (`fast`). */
function limitAlerts(plan: PlanSummary, currency: Currency): AlertItem[] {
	return plan.limits
		.filter((l) => l.over || l.fast)
		.map((l) => ({
			id: `limit-${currency}-${l.categoryId}`,
			kind: 'limit',
			name: l.name,
			status: l.over
				? { label: 'Te pasaste', tone: 'bad' }
				: { label: 'Vas rápido', tone: 'warning' },
			message: l.over
				? `${formatMoney(l.spent - l.amount, currency)} sobre el límite de ${formatMoney(l.amount, currency)}`
				: `Gastaste ${percent(l.share)} del límite y quedan ${days(plan.daysLeft)}`,
			href: `/plan?limit=${l.categoryId}`,
			switchCurrency: true,
			icon: toCategoryIconKey(l.icon),
			color: toSwatchKey(l.color),
			amount: null,
			accountName: null
		}));
}
