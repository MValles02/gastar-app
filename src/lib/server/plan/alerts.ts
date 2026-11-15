import { PLAN_CURRENCY, PLAN_STATUS_LABEL, PLAN_TONE, type StatusTone } from '#lib/plan.ts';
import {
	toCategoryIconKey,
	toSwatchKey,
	type CategoryIconKey,
	type SwatchKey
} from '#lib/appearance.ts';
import { formatMoney } from '#lib/money.ts';
import { accountSummary } from '../accounts/queries';
import { monthPlan, type MonthPlan } from './month-plan';

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
	/** The category's icon (limits); null when it has none. */
	icon: CategoryIconKey | null;
	/** The category's swatch (limits); null renders neutral. */
	color: SwatchKey | null;
};

type PlanSummary = MonthPlan['summary'];

/**
 * Alerts of the unified plan (a flat list), worked out from existing data (nothing is stored).
 * The plan first, then category limits. Fixed payments never alert: a pending one shows neutrally
 * on /plan ("Pendiente · día N").
 */
export async function alerts(userId: string): Promise<AlertItem[]> {
	const accounts = await accountSummary(userId);
	if (!accounts.some((a) => a.count > 0)) return [];
	const m = await monthPlan(userId);
	if (!m.hasPlan) return [];
	return [planAlert(m.summary), ...limitAlerts(m.summary)].filter((a) => a !== null);
}

const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
const percent = (share: number) => `${Math.round(share * 100)}%`;

function planAlert(plan: PlanSummary): AlertItem | null {
	const base = {
		id: 'plan',
		kind: 'plan',
		name: 'Plan',
		href: '/plan',
		icon: null,
		color: null
	} as const;
	if (plan.status === 'over')
		return {
			...base,
			status: { label: PLAN_STATUS_LABEL.over, tone: PLAN_TONE.over },
			message:
				plan.forSpending <= 0
					? `Tu ahorro y tus pagos fijos superan tus ingresos por ${formatMoney(-plan.forSpending, PLAN_CURRENCY)}`
					: `Tus gastos y pagos fijos pendientes superan lo que tenés por ${formatMoney(-plan.available, PLAN_CURRENCY)}`
		};
	if (plan.status === 'warn')
		return {
			...base,
			status: { label: PLAN_STATUS_LABEL.warn, tone: PLAN_TONE.warn },
			message: `Gastaste ${percent(plan.spentShare)} de lo que tenés para gastar y quedan ${days(plan.daysLeft)}`
		};
	return null;
}

function limitAlerts(plan: PlanSummary): AlertItem[] {
	return plan.limits
		.filter((l) => l.over || l.fast)
		.map((l) => ({
			id: `limit-${l.categoryId}`,
			kind: 'limit',
			name: l.name,
			status: l.over
				? { label: PLAN_STATUS_LABEL.over, tone: PLAN_TONE.over }
				: { label: PLAN_STATUS_LABEL.warn, tone: PLAN_TONE.warn },
			message: l.over
				? `${formatMoney(l.spent - l.amount, l.currency)} sobre el límite de ${formatMoney(l.amount, l.currency)}`
				: `Gastaste ${percent(l.share)} del límite y quedan ${days(plan.daysLeft)}`,
			href: `/plan?limit=${l.categoryId}`,
			icon: toCategoryIconKey(l.icon),
			color: toSwatchKey(l.color)
		}));
}
