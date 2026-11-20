// Pure: reads one Gmail message (format=full) and returns the purchase fields of a Visa alert. Nothing here
// stores or logs anything, and the body, subject and headers never leave this function.

import { obj } from '../json';
import {
	type AlertParser,
	type CardAlertResult,
	IGNORED,
	INVALID,
	authenticated,
	decodeEntities,
	headerValue,
	headersOf,
	labelledFields,
	messageParts,
	plain,
	senderOf
} from './alert-mail';

const SENDERS: readonly string[] = [
	'donotreplyalertadecomprasvisa@visa.com',
	'donotreplyvisapurchasealerts@visa.com'
];
const SUBJECT = 'Alerta de Compras Visa';

/** Label -> value of the "Label: value" lines from "Comercio:" on (the first one wins), and the intro before it. */
function readBlock(html: string) {
	const text = decodeEntities(html.replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]*>/g, ''));
	const rows = text.split('\n');
	const start = rows.findIndex((l) => plain(l).trim().startsWith('comercio:'));
	if (start < 0) return { fields: new Map<string, string>(), intro: '' };
	return {
		fields: labelledFields(rows.slice(start)),
		intro: plain(rows.slice(0, start).join(' '))
	};
}

/** `^(\d+)\.(\d{2})`, optionally followed directly by "(puede haber ...)": minor units, > 0. */
function minorUnits(raw: string): number | null {
	const m = /^(\d+)\.(\d{2})(\(.*\))?$/.exec(raw);
	if (!m) return null;
	const cents = Number(m[1]) * 100 + Number(m[2]);
	return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function parse(message: unknown): CardAlertResult {
	const msg = obj(message);
	const payload = obj(msg.payload);
	const headers = headersOf(payload);
	if (!SENDERS.includes(senderOf(headers))) return IGNORED;
	if (headerValue(headers, 'subject')?.trim() !== SUBJECT) return IGNORED;
	if (!authenticated(headers, 'visa.com')) return IGNORED;

	const parts = messageParts(msg, payload);
	if (!parts) return INVALID;

	const { fields, intro } = readBlock(parts.html);
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
			gmailMessageId: parts.id,
			network: 'visa',
			last4,
			merchant,
			country,
			currency,
			amount,
			foreign: intro.includes('en el exterior'),
			transactionType,
			installments: null,
			receivedAt: parts.receivedAt
		}
	};
}

export const visaAlert: AlertParser = { senders: SENDERS, parse };
