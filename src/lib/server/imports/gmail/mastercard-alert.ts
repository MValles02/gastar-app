// Pure: reads the HTML of one Banco Galicia Mastercard alert ("Aviso de consumo con tarjeta", sent by Fiserv)
// and returns its purchase fields. Nothing here stores or logs anything, and the body never leaves this
// function.

import type { Currency } from '#lib/money.ts';
import type { AlertKind } from '../card-alert';
import {
	type AlertParser,
	type AlertResult,
	type ParsedAlert,
	IGNORED,
	INVALID,
	decodeEntities,
	labelledFields,
	minorUnits,
	plain
} from './alert-mail';

/**
 * The sender also serves other cards and banks: only an alert whose intro (plain) names all of these lands on
 * the Galicia accounts.
 */
const ISSUER_MARKS = ['tarjeta mastercard', 'galicia'];

/** Plain type (single spaces) -> kind; any other type is `other`, stored as sent. */
const KINDS: Record<string, AlertKind> = { compra: 'purchase', 'compra reversada': 'reversal' };

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

/** es-AR "78.993,00" (dot thousands, comma decimals). */
function amountOf(raw: string): number | null {
	const m = /^(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})$/.exec(raw);
	return m ? minorUnits(m[1].replace(/\./g, ''), m[2]) : null;
}

function parse(html: string): AlertResult<ParsedAlert> {
	const { fields, intro } = readList(html);
	if (!ISSUER_MARKS.every((mark) => intro.includes(mark))) return IGNORED;
	const state = fields.get('estado');
	if (state && plain(state) !== 'aprobada') return IGNORED;

	const type = fields.get('tipo de movimiento');
	const merchant = fields.get('comercio');
	const country = fields.get('ubicacion');
	const last4 = fields.get('ultimos 4 digitos de la tarjeta');
	const currency = CURRENCY[plain(fields.get('moneda') ?? '')];
	const amount = amountOf(fields.get('importe') ?? '');
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
			last4,
			merchant,
			country,
			currency,
			amount,
			foreign: plain(country) !== 'argentina',
			kind: KINDS[plain(type).replace(/\s+/g, ' ')] ?? 'other',
			type,
			installments
		}
	};
}

export const mastercardAlert: AlertParser = {
	senders: ['alertas@misconsultas.com.ar'],
	domain: 'misconsultas.com.ar',
	subject: 'Aviso de consumo con tarjeta',
	parse
};
