// Pure: reads the HTML of one Visa alert and returns its purchase fields. Nothing here stores or logs
// anything, and the body never leaves this function.

import { alertKind } from '../card-alert';
import {
	type AlertParser,
	type AlertResult,
	type ParsedAlert,
	INVALID,
	decodeEntities,
	labelledFields,
	minorUnits,
	plain
} from './alert-mail';

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

/**
 * `^(\d+)\.(\d{2})`, optionally followed by a parenthesised note: "(puede haber ...)" directly
 * after, or " (aproximadamente N USD)" after a space (the ARS amount, the USD approximation is ignored).
 */
function amountOf(raw: string): number | null {
	const m = /^(\d+)\.(\d{2})\s*(\(.*\))?$/.exec(raw);
	return m ? minorUnits(m[1], m[2]) : null;
}

function parse(html: string): AlertResult<ParsedAlert> {
	const { fields, intro } = readBlock(html);
	const merchant = fields.get('comercio');
	const country = fields.get('pais');
	const last4 = fields.get('tarjeta');
	const type = fields.get('tipo de transaccion');
	const currency = fields.get('moneda');
	const amount = amountOf(fields.get('monto') ?? '');
	if (
		!merchant ||
		!country ||
		!type ||
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
			last4,
			merchant,
			country,
			currency,
			amount,
			foreign: intro.includes('en el exterior'),
			// Visa sends the stored words as they are ("Compra").
			kind: alertKind(type),
			type,
			installments: null
		}
	};
}

export const visaAlert: AlertParser = {
	senders: ['donotreplyalertadecomprasvisa@visa.com', 'donotreplyvisapurchasealerts@visa.com'],
	domain: 'visa.com',
	subject: 'Alerta de Compras Visa',
	parse
};
