import { CalendarDate, parseDate, startOfMonth, today } from '@internationalized/date';
import { APP_TZ } from './locale';

export { DAY_MS } from '#lib/shared/runtime.js';

/** "YYYY-MM" with a real month (01-12). The spending_plans month CHECK uses the same pattern. */
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Earliest movement date. */
export const MIN_DAY = '2000-01-01';

export const dayOfMonth = (isoDay: string) => Number(isoDay.slice(8, 10));

/** "Este mes" in Buenos Aires: the first of the month to today, as "YYYY-MM-DD". */
export function thisMonth(): [string, string] {
	const t = today(APP_TZ);
	return [startOfMonth(t).toString(), t.toString()];
}

/** A "YYYY-MM-DD" as a CalendarDate; '' or an invalid day (e.g. an echoed bad date) gives undefined. */
export function toCalendarDate(ymd: string | undefined) {
	try {
		return ymd ? parseDate(ymd) : undefined;
	} catch {
		return undefined;
	}
}

export const calendarFloor = (min: string | undefined) =>
	toCalendarDate(min) ?? new CalendarDate(1900, 1, 1);
