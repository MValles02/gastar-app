import type { PlanStatus, RecurringStatus } from '$lib/server/plan';

/** Visual tone shared by every status pill. */
export type StatusTone = 'ok' | 'warning' | 'bad' | 'neutral';

export const PLAN_TONE = {
	ok: 'ok',
	warn: 'warning',
	over: 'bad'
} as const satisfies Record<PlanStatus, StatusTone>;

export const DUE_TONE = {
	paid: 'ok',
	today: 'warning',
	overdue: 'bad',
	upcoming: 'neutral'
} as const satisfies Record<RecurringStatus, StatusTone>;
