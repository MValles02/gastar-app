import { mpApiBaseUrl } from './env';

/** Stored in mp_sync_state.last_error: a code only, never a message or payload. */
export type MpSyncError =
	'auth' | 'report_timeout' | 'network' | 'parse' | 'config' | 'reconnect' | `mp_${number}`;

/** What the inbox says after "No se pudo sincronizar" for each stored code. */
export const MP_ERROR_LABELS: Record<string, string> = {
	auth: 'token inválido o vencido',
	report_timeout: 'Mercado Pago tardó demasiado en generar el reporte',
	network: 'sin conexión con Mercado Pago',
	parse: 'reporte con formato inesperado',
	config: 'revisá la cuenta configurada',
	reconnect: 'hay que volver a vincular Mercado Pago'
};

/** The inbox label of a stored code; MP's HTTP errors (`mp_<status>`) name their status. */
export const mpErrorLabel = (code: string) =>
	MP_ERROR_LABELS[code] ?? `error ${code.replace(/^mp_/, '')} de Mercado Pago`;

const HTTP_TIMEOUT_MS = 30_000;
// Days, not hours: items from the old release-report sync carry day-start times, and dedupe makes overlap cheap.
export const OVERLAP_DAYS = 3;
const AMOUNT_RE = /^-?\d+(?:[.,]\d{1,2})?$/;

export type Auth = { token: string };

export type Row = Record<string, string>;

/** A sync failure; `message` is the code too. `detail` and `path` (MP's HTTP errors) are for the logs only. */
export class MpError extends Error {
	readonly code: MpSyncError;
	readonly detail?: string;
	readonly path?: string;
	constructor(code: MpSyncError, extra: { detail?: string; path?: string } = {}) {
		super(code);
		this.code = code;
		this.detail = extra.detail;
		this.path = extra.path;
	}
}

export const fail = (code: MpSyncError) => new MpError(code);
/** The MpSyncError code of a thrown value; null for anything not raised by `fail`. */
export const mpCode = (e: unknown) => (e instanceof MpError ? e.code : null);
export const isAuthError = (e: unknown) => mpCode(e) === 'auth';
export const obj = (v: unknown) =>
	v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
export const str = (v: unknown) =>
	typeof v === 'string' || typeof v === 'number' ? String(v) : null;
export const text = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null);

export async function api(
	path: string,
	{ token }: Auth,
	init: RequestInit = {}
): Promise<Response> {
	let res: Response;
	try {
		res = await fetch(mpApiBaseUrl() + path, {
			...init,
			headers: {
				...init.headers,
				Authorization: `Bearer ${token}`
			},
			signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
		});
	} catch {
		throw fail('network');
	}
	if (res.status === 401 || res.status === 403) throw fail('auth');
	if (!res.ok) {
		// MP's own error text (never the whole body, which could hold addresses), for the logs only.
		let detail = '';
		try {
			const b = obj(await res.json());
			detail = (str(b.message) ?? str(b.error) ?? '').slice(0, 120);
		} catch {
			/* no JSON body */
		}
		// The endpoint (no query) says which step failed.
		throw new MpError(`mp_${res.status}`, { detail, path: path.split('?')[0] });
	}
	return res;
}

export async function apiJson(path: string, auth: Auth, init?: RequestInit): Promise<unknown> {
	const res = await api(path, auth, init);
	try {
		return await res.json();
	} catch {
		throw fail('parse');
	}
}

/** "12.345,67" is not accepted: decimal mark only, 0-2 decimals. Integer cents without floats. */
export function cents(raw: string): number {
	const s = raw.trim();
	if (s === '') return 0;
	if (!AMOUNT_RE.test(s)) throw fail('parse');
	const neg = s.startsWith('-');
	const [int, frac = ''] = s.replace(/^-/, '').split(/[.,]/);
	const n = Number(int) * 100 + Number(frac.padEnd(2, '0'));
	return neg ? -n : n;
}

/** A JSON amount (pesos, up to 2 decimals) in cents; 0 when absent. */
export const jsonCents = (v: unknown) => (typeof v === 'number' ? Math.round(v * 100) : 0);

export function date(v: unknown): Date {
	const d = new Date(str(v) ?? '');
	if (Number.isNaN(d.getTime())) throw fail('parse');
	return d;
}

export function parseCsv(text: string): Row[] {
	if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
	const head = text.split('\n', 1)[0];
	const sep = (head.match(/;/g)?.length ?? 0) > (head.match(/,/g)?.length ?? 0) ? ';' : ',';
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c !== '"') field += c;
			else if (text[i + 1] === '"') {
				field += '"';
				i++;
			} else quoted = false;
		} else if (c === '"') quoted = true;
		else if (c === sep) {
			row.push(field);
			field = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else field += c;
	}
	if (field !== '' || row.length) rows.push([...row, field]);
	const [header, ...body] = rows.filter((r) => r.some((f) => f.trim() !== ''));
	if (!header) return [];
	const keys = header.map((h) => h.trim().toUpperCase());
	return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

export const atLeast = (d: Date, floor: Date | null) => (floor && floor > d ? floor : d);
