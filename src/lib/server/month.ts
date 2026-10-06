export const TZ = 'America/Argentina/Buenos_Aires';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

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

/** UTC offset of TZ at the start of the given month, e.g. "-03:00". */
function offsetAt(ym: string): string {
	const probe = new Date(`${ym}-01T12:00:00Z`);
	const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
		.formatToParts(probe)
		.find((p) => p.type === 'timeZoneName')!.value;
	return name === 'GMT' ? '+00:00' : name.slice(3);
}

/** Date to "YYYY-MM-DDTHH:mm" in TZ (datetime-local format). */
function toLocalInput(d: Date): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(d);
	const get = (t: string) => parts.find((p) => p.type === t)!.value;
	return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

const LOCAL_RE = /^(\d{4}-(?:0[1-9]|1[0-2]))-\d{2}T\d{2}:\d{2}$/;

/** Parses "YYYY-MM-DDTHH:mm" as TZ wall time; null on bad syntax or impossible dates. */
export function parseLocalDateTime(raw: string): Date | null {
	const m = LOCAL_RE.exec(raw);
	if (!m) return null;
	const d = new Date(`${raw}:00${offsetAt(m[1])}`);
	return Number.isNaN(d.getTime()) || toLocalInput(d) !== raw ? null : d;
}

export function shiftMonth(ym: string, delta: 1 | -1): string {
	const [y, m] = ym.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 1 + delta, 1));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(ym: string): { start: Date; end: Date } {
	const at = (m: string) => new Date(`${m}-01T00:00:00${offsetAt(m)}`);
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

export function dateLabel(d: Date): string {
	return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: TZ }).format(
		d
	);
}

/** Start (00:00 Buenos Aires) of a "YYYY-MM-DD" day; null for impossible dates. */
export function dayStart(ymd: string): Date | null {
	return parseLocalDateTime(`${ymd}T00:00`);
}

/** "YYYY-MM-DD" of a Date in TZ. */
export function localDay(d: Date): string {
	return toLocalInput(d).slice(0, 10);
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
