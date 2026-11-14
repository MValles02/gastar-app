import { PLAN_STATUS_LABEL, PLAN_TONE, type StatusTone } from '$lib/plan';
import {
	toCategoryIconKey,
	toSwatchKey,
	type CategoryIconKey,
	type SwatchKey
} from '../appearance';
import { CURRENCIES, formatMoney, type Currency } from '../money';
import { hasAccountsIn } from './dashboard';
import { accountSummary } from './dashboard-queries';
import { monthPlan, type MonthPlan } from './plan-view';

export type AlertItem = {
	id: string;
	kind: 'plan' | 'limit';
	/** Short display name: "Plan" or the category name. */
	name: string;
	status: { label: string; tone: StatusTone };
	/** One self-explanatory sentence (amounts inside). */
	message: string;
	/** App path the row opens. */
	href: string;
	/** Plan and limit pages read the currency from the cookie: open them through a POST to /currency. */
	switchCurrency: boolean;
	/** The category's icon (limits); null when it has none. */
	icon: CategoryIconKey | null;
	/** The category's swatch (limits); null renders neutral. */
	color: SwatchKey | null;
};

type PlanSummary = MonthPlan['summary'];

/**
 * Alerts per currency that has accounts, worked out from existing data (nothing is stored).
 * The plan first, then category limits. Never sums across currencies. Fixed payments never alert:
 * a pending one shows neutrally on /plan ("Pendiente · día N").
 */
export async function alerts(userId: string) {
	const accounts = await accountSummary(userId);
	const currencies = CURRENCIES.filter((c) => hasAccountsIn(accounts, c));

	return Promise.all(
		currencies.map(async (currency: Currency) => {
			const m = await monthPlan(userId, currency);
			const plan = m.hasPlan ? m.summary : null;
			const planAlerts = plan ? [planAlert(plan, currency), ...limitAlerts(plan, currency)] : [];
			const items: AlertItem[] = planAlerts.filter((a) => a !== null);
			return { currency, items };
		})
	);
}

const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
const percent = (share: number) => `${Math.round(share * 100)}%`;

function planAlert(plan: PlanSummary, currency: Currency): AlertItem | null {
	const base = {
		id: `plan-${currency}`,
		kind: 'plan',
		name: 'Plan',
		href: '/plan',
		switchCurrency: true,
		icon: null,
		color: null
	} as const;
	if (plan.status === 'over')
		return {
			...base,
			status: { label: PLAN_STATUS_LABEL.over, tone: PLAN_TONE.over },
			message:
				plan.forSpending <= 0
					? `Tu ahorro y tus pagos fijos superan tus ingresos por ${formatMoney(-plan.forSpending, currency)}`
					: `Tus gastos y pagos fijos pendientes superan lo que tenés por ${formatMoney(-plan.available, currency)}`
		};
	if (plan.status === 'warn')
		return {
			...base,
			status: { label: PLAN_STATUS_LABEL.warn, tone: PLAN_TONE.warn },
			message: `Gastaste ${percent(plan.spentShare)} de lo que tenés para gastar y quedan ${days(plan.daysLeft)}`
		};
	return null;
}

function limitAlerts(plan: PlanSummary, currency: Currency): AlertItem[] {
	return plan.limits
		.filter((l) => l.over || l.fast)
		.map((l) => ({
			id: `limit-${currency}-${l.categoryId}`,
			kind: 'limit',
			name: l.name,
			status: l.over
				? { label: PLAN_STATUS_LABEL.over, tone: PLAN_TONE.over }
				: { label: PLAN_STATUS_LABEL.warn, tone: PLAN_TONE.warn },
			message: l.over
				? `${formatMoney(l.spent - l.amount, currency)} sobre el límite de ${formatMoney(l.amount, currency)}`
				: `Gastaste ${percent(l.share)} del límite y quedan ${days(plan.daysLeft)}`,
			href: `/plan?limit=${l.categoryId}`,
			switchCurrency: true,
			icon: toCategoryIconKey(l.icon),
			color: toSwatchKey(l.color)
		}));
}
