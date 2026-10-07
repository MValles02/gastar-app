export const TZ = 'America/Argentina/Buenos_Aires';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_RE = /^(\d{4}-(?:0[1-9]|1[0-2]))-\d{2}$/;

export function currentMonth(now: Date): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit'
	}).formatToParts(now);
	const get = (t: string) => parts.find((p) => p.type === t)!.value;
	return `${get('year')}-${get('month')}`;
}

export function parseMonth(raw: string | null, now: Date): string {
	const current = currentMonth(now);
	return raw !== null && MONTH_RE.test(raw) ? raw : current;
}

/** UTC offset of TZ at the given instant, e.g. "-03:00". */
function offsetAt(probe: Date): string {
	const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
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
	if (ym === todayYm) return Number(todayYmd.slice(8, 10));
	return ym < todayYm ? daysInMonth(ym) : 0;
}

export function monthRange(ym: string): { start: Date; end: Date } {
	const at = (m: string) => new Date(`${m}-01T00:00:00${offsetAt(new Date(`${m}-01T12:00:00Z`))}`);
	return { start: at(ym), end: at(shiftMonth(ym, 1)) };
}

export function monthLabel(ym: string, withYear = true): string {
	const [y, m] = ym.split('-').map(Number);
	const s = new Intl.DateTimeFormat('es-AR', {
		month: 'long',
		...(withYear ? { year: 'numeric' } : {}),
		timeZone: 'UTC'
	}).format(new Date(Date.UTC(y, m - 1, 1, 12)));
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Mayo", "Sep.": full name when short, else 3 letters. */
export function shortMonth(ym: string): string {
	const name = monthLabel(ym, false);
	return name.length <= 5 ? name : `${name.slice(0, 3)}.`;
}

export function dateLabel(d: Date): string {
	return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: TZ }).format(
		d
	);
}

/** Start (00:00 Buenos Aires) of a "YYYY-MM-DD" day; null for impossible dates. */
export function dayStart(ymd: string): Date | null {
	if (!DAY_RE.test(ymd)) return null;
	// Probe the offset at both ends of the day so mid-month DST transitions resolve either way.
	for (const t of ['00:00:00', '12:00:00']) {
		const d = new Date(`${ymd}T00:00:00${offsetAt(new Date(`${ymd}T${t}Z`))}`);
		if (!Number.isNaN(d.getTime()) && localDay(d) === ymd) return d;
	}
	return null;
}

/** "YYYY-MM-DD" of a Date in TZ. */
export function localDay(d: Date): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(d);
}

/** "Hoy", "Ayer" or e.g. "Miércoles 30 de septiembre" (year added when not todayYmd's year). */
export function dayHeading(ymd: string, todayYmd: string): string {
	if (ymd === todayYmd) return 'Hoy';
	const at = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), 12);
	if (at(todayYmd) - at(ymd) === 86_400_000) return 'Ayer';
	const sameYear = ymd.slice(0, 4) === todayYmd.slice(0, 4);
	const s = new Intl.DateTimeFormat('es-AR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		...(sameYear ? {} : { year: 'numeric' }),
		timeZone: 'UTC'
	})
		.format(new Date(at(ymd)))
		.replace(',', '');
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fullDateLabel(d: Date): string {
	return new Intl.DateTimeFormat('es-AR', { dateStyle: 'full', timeZone: TZ }).format(d);
}
