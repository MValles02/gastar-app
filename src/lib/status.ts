import type { PlanStatus, RecurringStatus } from '$lib/server/plan';

/** Visual tone shared by every status pill. */
export type StatusTone = 'ok' | 'warning' | 'bad' | 'neutral';

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

/** A recurring rule's pill tone; an unregistered income past its day is expected, not overdue, so it stays neutral. */
export const dueTone = (status: RecurringStatus, type: string): StatusTone =>
	status === 'overdue' && type === 'income' ? 'neutral' : DUE_TONE[status];
