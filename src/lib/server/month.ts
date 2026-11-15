import { DAY_MS, dayOfMonth, MONTH_RE } from '#lib/dates.ts';
import { APP_TZ, formatDay, LOCALE } from '#lib/locale.ts';

const DAY_RE = /^(\d{4}-(?:0[1-9]|1[0-2]))-\d{2}$/;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function currentMonth(now: Date): string {
	return localDay(now).slice(0, 7);
}

export function parseMonth(raw: string | null, now: Date): string {
	const current = currentMonth(now);
	return raw !== null && MONTH_RE.test(raw) ? raw : current;
}

/** UTC offset of APP_TZ at the given instant, e.g. "-03:00". */
function offsetAt(probe: Date): string {
	const name = new Intl.DateTimeFormat('en-US', { timeZone: APP_TZ, timeZoneName: 'longOffset' })
		.formatToParts(probe)
		.find((p) => p.type === 'timeZoneName')!.value;
	return name === 'GMT' ? '+00:00' : name.slice(3);
}

export function shiftMonth(ym: string, delta: 1 | -1): string {
	const [y, m] = ym.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 1 + delta, 1));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** n months ending at ym, oldest first. */
export function lastMonths(ym: string, n: number): string[] {
	const out = [ym];
	while (out.length < n) out.unshift(shiftMonth(out[0], -1));
	return out;
}

export function daysInMonth(ym: string): number {
	const [y, m] = ym.split('-').map(Number);
	return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Day of `ym` that counts as "today": today's day in the current month, the last day for past months, 0 for future ones. */
export function elapsedDays(ym: string, todayYmd: string): number {
	const todayYm = todayYmd.slice(0, 7);
	if (ym === todayYm) return dayOfMonth(todayYmd);
	return ym < todayYm ? daysInMonth(ym) : 0;
}

/** Days left in `ym` counting today, between 1 and the month length (a past or future month never reads 0). */
export function daysLeftIn(ym: string, todayYmd: string): number {
	const days = daysInMonth(ym);
	return Math.min(Math.max(days - elapsedDays(ym, todayYmd) + 1, 1), days);
}

export function monthRange(ym: string): { start: Date; end: Date } {
	const at = (m: string) => new Date(`${m}-01T00:00:00${offsetAt(new Date(`${m}-01T12:00:00Z`))}`);
	return { start: at(ym), end: at(shiftMonth(ym, 1)) };
}

/** Full months of history behind suggested rules and limits; a suggested rule appears in each of them. */
export const HISTORY_MONTHS = 3;

/** The `HISTORY_MONTHS` full months before `ym`, as a range (the window for suggested rules and limits). */
export function lastFullMonths(ym: string) {
	const [oldest] = lastMonths(shiftMonth(ym, -1), HISTORY_MONTHS);
	return { start: monthRange(oldest).start, end: monthRange(ym).start };
}

export function monthLabel(ym: string, withYear = true): string {
	const [y, m] = ym.split('-').map(Number);
	return capitalize(
		new Intl.DateTimeFormat(LOCALE, {
			month: 'long',
			...(withYear ? { year: 'numeric' } : {}),
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(y, m - 1, 1, 12)))
	);
}

/** List month header: "Noviembre 2026" (capitalized month, space, year; no "de"). */
export const monthHeading = (ym: string) => `${monthLabel(ym, false)} ${ym.slice(0, 4)}`;

/** "Ene", "Sep": capitalized first 3 letters, no dot. */
export function shortMonth(ym: string): string {
	return monthLabel(ym, false).slice(0, 3);
}

export function dateLabel(d: Date): string {
	return formatDay(localDay(d));
}

/** Start (00:00 Buenos Aires) of a "YYYY-MM-DD" day; null for impossible dates. */
export function dayStart(ymd: string): Date | null {
	if (!DAY_RE.test(ymd)) return null;
	// Probe the offset at both ends of the day so mid-month DST transitions resolve either way.
	for (const t of ['00:00:00', '12:00:00']) {
		// Days past 31 (or 00) parse as Invalid Date, which offsetAt cannot format.
		const probe = new Date(`${ymd}T${t}Z`);
		if (Number.isNaN(probe.getTime())) return null;
		const d = new Date(`${ymd}T00:00:00${offsetAt(probe)}`);
		if (!Number.isNaN(d.getTime()) && localDay(d) === ymd) return d;
	}
	return null;
}

/** "YYYY-MM-DD" of a Date in APP_TZ. */
export function localDay(d: Date): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: APP_TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(d);
}

/** "Hoy", "Ayer" or e.g. "Miércoles 30 de septiembre" (year added when not todayYmd's year); `short`: "Miércoles 30". */
export function dayHeading(ymd: string, todayYmd: string, short = false): string {
	if (ymd === todayYmd) return 'Hoy';
	const at = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), 12);
	if (at(todayYmd) - at(ymd) === DAY_MS) return 'Ayer';
	if (short)
		return capitalize(
			new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', timeZone: 'UTC' })
				.format(new Date(at(ymd)))
				.replace(',', '')
		);
	const sameYear = ymd.slice(0, 4) === todayYmd.slice(0, 4);
	return capitalize(
		new Intl.DateTimeFormat(LOCALE, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			...(sameYear ? {} : { year: 'numeric' }),
			timeZone: 'UTC'
		})
			.format(new Date(at(ymd)))
			.replace(',', '')
	);
}
