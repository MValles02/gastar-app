// Pure helpers shared by the card-alert parsers: headers, sender authentication, the HTML part and its entities.
// Nothing here stores or logs anything.

import type { AlertKind, CardAlert } from '../card-alert';
import { obj } from '../json';

/**
 * `ignored`: not a purchase alert of that sender, or not authenticated as it (silently skipped).
 * `invalid`: it is one but does not parse (never guessed; the sync reports it by code).
 */
export type AlertResult<T> =
	{ status: 'ignored' } | { status: 'invalid' } | { status: 'ok'; alert: T };
export type CardAlertResult = AlertResult<CardAlert>;

/**
 * What a parser reads from the alert's HTML. The message id, receive time and network are not in it: the
 * gate (parseAlert) adds them, and stores `type` only for the `other` kind (see storedType).
 */
export type ParsedAlert = Omit<
	CardAlert,
	'gmailMessageId' | 'network' | 'transactionType' | 'receivedAt'
> & { kind: AlertKind; type: string };

export const IGNORED = { status: 'ignored' } as const;
export const INVALID = { status: 'invalid' } as const;

/**
 * One card network's alert mail: the senders whose mail it reads, the domain that must authenticate it
 * (DKIM and DMARC), its exact subject, and the parser of its HTML. parseAlert checks sender, subject and
 * authentication before `parse` runs.
 */
export type AlertParser = {
	senders: readonly string[];
	domain: string;
	subject: string;
	parse: (html: string) => AlertResult<ParsedAlert>;
};

/** Minor units from a whole part and a two-digit cents part: null unless a safe integer > 0. */
export function minorUnits(whole: string, cents: string): number | null {
	const value = Number(whole) * 100 + Number(cents);
	return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export type Header = { name: string; value: string };

export const headersOf = (payload: Record<string, unknown>): Header[] =>
	Array.isArray(payload.headers)
		? payload.headers.map((h) => ({
				name: String(obj(h).name ?? '').toLowerCase(),
				value: String(obj(h).value ?? '')
			}))
		: [];

export const headerValue = (headers: Header[], name: string) =>
	headers.find((h) => h.name === name)?.value;

/** The lowercased address of the From header ('' when missing). */
export function senderOf(headers: Header[]): string {
	const from = headerValue(headers, 'from') ?? '';
	return (/<([^>]+)>/.exec(from)?.[1] ?? from).trim().toLowerCase();
}

/** Gmail's own verdict on the top header: DKIM and DMARC both pass for `domain`. */
export function authenticated(headers: Header[], domain: string): boolean {
	const value = headerValue(headers, 'authentication-results');
	if (!value || !value.trim().startsWith('mx.google.com')) return false;
	const clauses = value.split(';').map((c) => c.trim());
	const passes = (method: string, ids: RegExp) =>
		clauses.some((c) => c.startsWith(`${method}=pass`) && ids.test(c));
	const d = domain.replace(/\./g, '\\.');
	return (
		passes('dkim', new RegExp(`(?:^|\\s)header\\.(?:i=@|d=)${d}(?=\\s|$)`)) &&
		passes('dmarc', new RegExp(`(?:^|\\s)header\\.from=${d}(?=\\s|$)`))
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

export const decodeEntities = (s: string) =>
	s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, dec, hex, name) => {
		if (name) return ENTITIES[name] ?? m;
		const code = dec ? Number(dec) : parseInt(hex, 16);
		return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
	});

/** The decoded `text/html` part of the message, or null. */
export function htmlOf(part: Record<string, unknown>): string | null {
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

/** Lowercase without accents, for comparing labels and fixed words. */
export const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Label (plain) -> value of each "Label: value" row (the first one wins). */
export function labelledFields(rows: Iterable<string>): Map<string, string> {
	const fields = new Map<string, string>();
	for (const row of rows) {
		const m = /^\s*([^:]{1,40}):\s*([\s\S]*?)\s*$/.exec(row);
		const label = m && plain(m[1]).trim();
		if (m && label && !fields.has(label)) fields.set(label, m[2]);
	}
	return fields;
}

/** The message's id, receive time and HTML, or null when any is missing. */
export function messageParts(msg: Record<string, unknown>, payload: Record<string, unknown>) {
	const id = msg.id;
	const internal = Number(msg.internalDate);
	const html = htmlOf(payload);
	if (typeof id !== 'string' || !id || !(internal > 0) || html === null) return null;
	return { id, receivedAt: new Date(internal), html };
}
