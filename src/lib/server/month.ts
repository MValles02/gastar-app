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
	return raw !== null && MONTH_RE.test(raw) && raw <= current ? raw : current;
}

/** UTC offset of TZ at the start of the given month, e.g. "-03:00". */
function offsetAt(ym: string): string {
	const probe = new Date(`${ym}-01T12:00:00Z`);
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

export function monthRange(ym: string): { start: Date; end: Date } {
	const at = (m: string) => new Date(`${m}-01T00:00:00${offsetAt(m)}`);
	return { start: at(ym), end: at(shiftMonth(ym, 1)) };
}

export function monthLabel(ym: string): string {
	const [y, m] = ym.split('-').map(Number);
	const s = new Intl.DateTimeFormat('es-AR', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(Date.UTC(y, m - 1, 1, 12)));
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dateLabel(d: Date): string {
	return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: TZ }).format(
		d
	);
}
