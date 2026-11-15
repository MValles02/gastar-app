import { startOfMonth, today } from '@internationalized/date';
import { APP_TZ } from './locale';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM" with a real month (01-12). The spending_plans month CHECK uses the same pattern. */
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Earliest movement date. */
export const MIN_DAY = '2000-01-01';

/** Day of the month of a "YYYY-MM-DD" string: "2024-02-29" -> 29. */
export const dayOfMonth = (isoDay: string) => Number(isoDay.slice(8, 10));

/** "Este mes" in Buenos Aires: the first of the month to today, as "YYYY-MM-DD". */
export function thisMonth(): [string, string] {
	const t = today(APP_TZ);
	return [startOfMonth(t).toString(), t.toString()];
}
