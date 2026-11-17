// Pure: reads one Gmail message (format=full) and returns the purchase fields of a Visa alert. Nothing here
// stores or logs anything, and the body, subject and headers never leave this function.

export const VISA_SENDERS = [
	'donotreplyalertadecomprasvisa@visa.com',
	'donotreplyvisapurchasealerts@visa.com'
] as const;
const SUBJECT = 'Alerta de Compras Visa';

export type VisaAlert = {
	gmailMessageId: string;
	network: 'visa';
	last4: string;
	merchant: string;
	country: string;
	currency: 'ARS' | 'USD';
	/** Minor units of `currency`. */
	amount: number;
	foreign: boolean;
	transactionType: string;
	receivedAt: Date;
};

/**
 * `ignored`: not a purchase alert of Visa, or not authenticated as Visa (silently skipped).
 * `invalid`: it is one but does not parse (never guessed; the sync reports it by code).
 */
export type VisaAlertResult =
	{ status: 'ignored' } | { status: 'invalid' } | { status: 'ok'; alert: VisaAlert };

const IGNORED = { status: 'ignored' } as const;
const INVALID = { status: 'invalid' } as const;

const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

type Header = { name: string; value: string };

const headersOf = (payload: Record<string, unknown>): Header[] =>
	Array.isArray(payload.headers)
		? payload.headers.map((h) => ({
				name: String(obj(h).name ?? '').toLowerCase(),
				value: String(obj(h).value ?? '')
			}))
		: [];

/** Gmail's own verdict on the top header: DKIM and DMARC both pass for visa.com. */
function authenticated(headers: Header[]): boolean {
	const value = headers.find((h) => h.name === 'authentication-results')?.value;
	if (!value || !value.trim().startsWith('mx.google.com')) return false;
	const clauses = value.split(';').map((c) => c.trim());
	const passes = (method: string, ids: RegExp) =>
		clauses.some((c) => c.startsWith(`${method}=pass`) && ids.test(c));
	return (
		passes('dkim', /(?:^|\s)header\.(?:i=@|d=)visa\.com(?=\s|$)/) &&
		passes('dmarc', /(?:^|\s)header\.from=visa\.com(?=\s|$)/)
	);
}

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	aacute: 'á',
	eacute: 'é',
	iacute: 'í',
	oacute: 'ó',
	uacute: 'ú',
	Aacute: 'Á',
	Eacute: 'É',
	Iacute: 'Í',
	Oacute: 'Ó',
	Uacute: 'Ú',
	ntilde: 'ñ',
	Ntilde: 'Ñ',
	uuml: 'ü',
	Uuml: 'Ü'
};

const decodeEntities = (s: string) =>
	s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, dec, hex, name) => {
		if (name) return ENTITIES[name] ?? m;
		const code = dec ? Number(dec) : parseInt(hex, 16);
		return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
	});

/** The decoded `text/html` part of the message, or null. */
function htmlOf(part: Record<string, unknown>): string | null {
	const data = obj(part.body).data;
	if (part.mimeType === 'text/html' && typeof data === 'string') {
		return Buffer.from(data, 'base64url').toString('utf8');
	}
	if (Array.isArray(part.parts)) {
		for (const p of part.parts) {
			const html = htmlOf(obj(p));
			if (html !== null) return html;
		}
	}
	return null;
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Label -> value of the "Label: value" lines from "Comercio:" on (the first one wins), and the intro before it. */
function readBlock(html: string) {
	const text = decodeEntities(html.replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]*>/g, ''));
	const rows = text.split('\n');
	const start = rows.findIndex((l) => plain(l).trim().startsWith('comercio:'));
	const fields = new Map<string, string>();
	if (start < 0) return { fields, intro: '' };
	for (const row of rows.slice(start)) {
		const m = /^\s*([^:]{1,40}):\s*(.*?)\s*$/.exec(row);
		const label = m && plain(m[1]).trim();
		if (m && label && !fields.has(label)) fields.set(label, m[2]);
	}
	return { fields, intro: plain(rows.slice(0, start).join(' ')) };
}

/** `^(\d+)\.(\d{2})`, optionally followed directly by "(puede haber ...)": minor units, > 0. */
function minorUnits(raw: string): number | null {
	const m = /^(\d+)\.(\d{2})(\(.*\))?$/.exec(raw);
	if (!m) return null;
	const cents = Number(m[1]) * 100 + Number(m[2]);
	return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function parseVisaAlert(message: unknown): VisaAlertResult {
	const msg = obj(message);
	const payload = obj(msg.payload);
	const headers = headersOf(payload);
	const from = headers.find((h) => h.name === 'from')?.value ?? '';
	const address = (/<([^>]+)>/.exec(from)?.[1] ?? from).trim().toLowerCase();
	if (!(VISA_SENDERS as readonly string[]).includes(address)) return IGNORED;
	if (headers.find((h) => h.name === 'subject')?.value.trim() !== SUBJECT) return IGNORED;
	if (!authenticated(headers)) return IGNORED;

	const id = msg.id;
	const internal = Number(msg.internalDate);
	const html = htmlOf(payload);
	if (typeof id !== 'string' || !id || !(internal > 0) || html === null) return INVALID;

	const { fields, intro } = readBlock(html);
	const merchant = fields.get('comercio');
	const country = fields.get('pais');
	const last4 = fields.get('tarjeta');
	const transactionType = fields.get('tipo de transaccion');
	const currency = fields.get('moneda');
	const amount = minorUnits(fields.get('monto') ?? '');
	if (
		!merchant ||
		!country ||
		!transactionType ||
		!last4 ||
		!/^\d{4}$/.test(last4) ||
		(currency !== 'ARS' && currency !== 'USD') ||
		amount === null
	) {
		return INVALID;
	}
	return {
		status: 'ok',
		alert: {
			gmailMessageId: id,
			network: 'visa',
			last4,
			merchant,
			country,
			currency,
			amount,
			foreign: intro.includes('en el exterior'),
			transactionType,
			receivedAt: new Date(internal)
		}
	};
}
