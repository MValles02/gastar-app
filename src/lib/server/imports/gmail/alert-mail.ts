// Pure helpers shared by the card-alert parsers: headers, sender authentication, the HTML part and its entities.
// Nothing here stores or logs anything.

import type { CardNetwork } from '#lib/imports.ts';
import type { Currency } from '#lib/money.ts';
import { obj } from '../json';

export const PURCHASE = 'Compra';
/** The stored type of a "COMPRA REVERSADA" alert: it cancels an earlier purchase (see convertWaitingAlerts). */
export const REVERSAL = 'Compra reversada';

export type CardAlert = {
	gmailMessageId: string;
	network: CardNetwork;
	last4: string;
	merchant: string;
	country: string;
	currency: Currency;
	/** Minor units of `currency`. */
	amount: number;
	foreign: boolean;
	transactionType: string;
	/** The purchase's installment count (cuotas); null when the alert does not say (Visa). */
	installments: number | null;
	receivedAt: Date;
};

/**
 * `ignored`: not a purchase alert of that sender, or not authenticated as it (silently skipped).
 * `invalid`: it is one but does not parse (never guessed; the sync reports it by code).
 */
export type CardAlertResult =
	{ status: 'ignored' } | { status: 'invalid' } | { status: 'ok'; alert: CardAlert };

export const IGNORED = { status: 'ignored' } as const;
export const INVALID = { status: 'invalid' } as const;

/** One card network's alert parser and the senders whose mail it reads. */
export type AlertParser = {
	senders: readonly string[];
	parse: (message: unknown) => CardAlertResult;
};

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

/** The sender address of a Gmail message (format=full). */
export const messageSender = (message: unknown) => senderOf(headersOf(obj(obj(message).payload)));

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
