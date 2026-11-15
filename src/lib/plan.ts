/** Plan vocabulary shared by the server and the screens: statuses, their tones and labels. */

/** The plan is always in pesos; USD items convert at the plan rate. */
export const PLAN_CURRENCY = 'ARS' as const;

/** Savings percent is stored as percent x 100 (1000 = 10 %), at most 100 %. */
export const SAVINGS_PERCENT_MAX = 10000;

/** Visual tone shared by every status pill. */
export type StatusTone = 'ok' | 'warning' | 'bad' | 'neutral';

export type PlanStatus = 'ok' | 'warn' | 'over';
export type RecurringStatus = 'paid' | 'pending';

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
	ok: 'Vas bien',
	warn: 'Vas rápido',
	over: 'Te pasaste'
};

export const PLAN_TONE = {
	ok: 'ok',
	warn: 'warning',
	over: 'bad'
} as const satisfies Record<PlanStatus, StatusTone>;

const DUE_TONE = {
	paid: 'ok',
	pending: 'neutral'
} as const satisfies Record<RecurringStatus, StatusTone>;

/** A recurring rule's pill tone: paid this month, or pending (neutral). */
export const dueTone = (status: RecurringStatus): StatusTone => DUE_TONE[status];

/** `day` is the due day clamped to the month. */
export function dueLabel({ status, day }: { status: RecurringStatus; day: number }, type: string) {
	if (status === 'paid') return type === 'income' ? 'Cobrado' : 'Pagado';
	return `Pendiente · día ${day}`;
}

export const MAX_DAY_OF_MONTH = 31;

export type RuleState = {
	archivedAt: Date | null;
	accountArchivedAt: Date | null;
	categoryArchivedAt: Date | null;
};

/** A rule counts only while the rule, its account and its category are all unarchived. */
export function isRecurringActive(r: RuleState): boolean {
	return !r.archivedAt && !r.accountArchivedAt && !r.categoryArchivedAt;
}

/** Why a rule is inactive (the rule itself first, then its account, then its category); null when active. */
export function inactiveReason(r: RuleState): string | null {
	if (r.archivedAt) return 'Desactivado';
	if (r.accountArchivedAt) return 'Cuenta archivada';
	if (r.categoryArchivedAt) return 'Categoría archivada';
	return null;
}

/** A category limit's pace: over it, or within it but spending faster than the month elapses. */
export function limitPace(spent: number, limit: number, elapsedShare: number) {
	const share = limit > 0 ? spent / limit : 0;
	return { share, over: spent > limit, fast: spent <= limit && share > elapsedShare };
}

/** Whole units (ARS has no decimals), rounded down, in cents. `p` is percent x 100 (1000 = 10 %). */
export function savingsFromPercent(income: number, p: number): number {
	return Number((BigInt(income) * BigInt(p)) / 1_000_000n) * 100;
}

/** The plan's savings for `income`: the percentage of it when set, else the fixed amount. */
export function effectiveSavings(
	plan: { savings: number; savingsPercent: number | null },
	income: number
): number {
	return plan.savingsPercent != null
		? savingsFromPercent(income, plan.savingsPercent)
		: plan.savings;
}
