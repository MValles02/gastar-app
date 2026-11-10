/** Plan vocabulary shared by the server and the screens: statuses, their tones and labels. */

/** Visual tone shared by every status pill. */
export type StatusTone = 'ok' | 'warning' | 'bad' | 'neutral';

export type PlanStatus = 'ok' | 'warn' | 'over';
export type RecurringStatus = 'paid' | 'overdue' | 'today' | 'upcoming';

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
	today: 'warning',
	overdue: 'bad',
	upcoming: 'neutral'
} as const satisfies Record<RecurringStatus, StatusTone>;

/** An unregistered income past its day is not late, just expected ("Esperado el día N"). */
const isExpectedIncome = (status: RecurringStatus, type: string) =>
	status === 'overdue' && type === 'income';

export const dueTone = (status: RecurringStatus, type: string): StatusTone =>
	isExpectedIncome(status, type) ? 'neutral' : DUE_TONE[status];

/** `day` is the due day clamped to the month; `daysLeft` is negative when overdue. */
export function dueLabel(
	{ status, daysLeft, day }: { status: RecurringStatus; daysLeft: number; day: number },
	type: string
): string {
	if (status === 'paid') return type === 'income' ? 'Cobrado' : 'Pagado';
	if (status === 'today') return 'Vence hoy';
	if (isExpectedIncome(status, type)) return `Esperado el día ${day}`;
	if (status === 'overdue')
		return daysLeft === -1 ? 'Venció ayer' : `Venció hace ${-daysLeft} días`;
	return daysLeft === 1 ? 'Mañana' : `En ${daysLeft} días`;
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
