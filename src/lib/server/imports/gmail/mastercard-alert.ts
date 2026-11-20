// Pure: reads one Gmail message (format=full) and returns the purchase fields of a Banco Galicia Mastercard
// alert ("Aviso de consumo con tarjeta", sent by Fiserv). Nothing here stores or logs anything, and the body,
// subject and headers never leave this function.

import type { Currency } from '#lib/money.ts';
import {
	PURCHASE,
	REVERSAL,
	type CardAlertResult,
	IGNORED,
	INVALID,
	authenticated,
	decodeEntities,
	headerValue,
	headersOf,
	labelledFields,
	messageParts,
	obj,
	plain,
	senderOf
} from './alert-mail';

export const MASTERCARD_SENDER = 'alertas@misconsultas.com.ar';
const SUBJECT = 'Aviso de consumo con tarjeta';
/** Plain type -> stored type; any other type is kept as sent. */
const TYPES: Record<string, string> = { compra: PURCHASE, 'compra reversada': REVERSAL };

/** Plain (lowercase, unaccented) currency word -> currency; anything else is not guessed. */
const CURRENCY: Record<string, Currency> = {
	pesos: 'ARS',
	dolares: 'USD',
	usd: 'USD',
	u$s: 'USD'
};

/** Label (plain) -> value of each `<li>Label: value</li>` (the first one wins), and the text before the list. */
function readList(html: string) {
	const text = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, ''));
	const fields = labelledFields(
		Array.from(html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi), (m) => text(m[1]))
	);
	const start = html.search(/<li\b/i);
	return { fields, intro: plain(text(start < 0 ? html : html.slice(0, start))) };
}

/** es-AR "78.993,00" (dot thousands, comma decimals): minor units, > 0. */
function minorUnits(raw: string): number | null {
	const m = /^(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})$/.exec(raw);
	if (!m) return null;
	const cents = Number(m[1].replace(/\./g, '')) * 100 + Number(m[2]);
	return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function parseMastercardAlert(message: unknown): CardAlertResult {
	const msg = obj(message);
	const payload = obj(msg.payload);
	const headers = headersOf(payload);
	if (senderOf(headers) !== MASTERCARD_SENDER) return IGNORED;
	if (headerValue(headers, 'subject')?.trim() !== SUBJECT) return IGNORED;
	if (!authenticated(headers, 'misconsultas.com.ar')) return IGNORED;

	const parts = messageParts(msg, payload);
	if (!parts) return INVALID;

	const { fields, intro } = readList(parts.html);
	// The sender also serves other cards and banks: only a Galicia Mastercard lands on the Galicia accounts.
	if (!intro.includes('tarjeta mastercard') || !intro.includes('galicia')) return IGNORED;
	const state = fields.get('estado');
	if (state && plain(state) !== 'aprobada') return IGNORED;

	const type = fields.get('tipo de movimiento');
	const merchant = fields.get('comercio');
	const country = fields.get('ubicacion');
	const last4 = fields.get('ultimos 4 digitos de la tarjeta');
	const currency = CURRENCY[plain(fields.get('moneda') ?? '')];
	const amount = minorUnits(fields.get('importe') ?? '');
	const cuotas = fields.get('cantidad cuotas') ?? '';
	const installments = /^\d{1,3}$/.test(cuotas) ? Number(cuotas) : 0;
	if (
		!state ||
		!type ||
		!merchant ||
		!country ||
		!last4 ||
		!/^\d{4}$/.test(last4) ||
		!currency ||
		amount === null ||
		installments < 1
	) {
		return INVALID;
	}
	return {
		status: 'ok',
		alert: {
			gmailMessageId: parts.id,
			network: 'mastercard',
			last4,
			merchant,
			country,
			currency,
			amount,
			foreign: plain(country) !== 'argentina',
			// The existing purchase value, so the conversion treats it as one; other types are kept as sent.
			transactionType: TYPES[plain(type).replace(/\s+/g, ' ')] ?? type,
			installments,
			receivedAt: parts.receivedAt
		}
	};
}
