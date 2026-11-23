// Which parser reads each card network's Gmail alerts, and the one gate every alert goes through. Pure:
// nothing here stores or logs anything.

import { CARD_NETWORKS, type CardNetwork } from '#lib/imports.ts';
import { storedType } from '../card-alert';
import { obj } from '../json';
import {
	type AlertParser,
	type CardAlertResult,
	IGNORED,
	INVALID,
	authenticated,
	headerValue,
	headersOf,
	messageParts,
	senderOf
} from './alert-mail';
import { mastercardAlert } from './mastercard-alert';
import { visaAlert } from './visa-alert';

/** The Gmail alert parser of each card network (the client-safe side is CARD_NETWORK). */
const ALERT_PARSER: Record<CardNetwork, AlertParser> = {
	visa: visaAlert,
	mastercard: mastercardAlert
};

/** The network and parser of each alert sender. */
const BY_SENDER = new Map(
	CARD_NETWORKS.flatMap((network) =>
		ALERT_PARSER[network].senders.map(
			(s) => [s, { network, parser: ALERT_PARSER[network] }] as const
		)
	)
);

/** Every alert sender, for the Gmail search. */
export const ALERT_SENDERS = [...BY_SENDER.keys()];

/**
 * Reads one Gmail message (format=full): ignored unless it comes from a known sender with that network's
 * subject and passes its domain's authentication; then its parser reads the HTML, and the network, message
 * id and receive time are added here.
 */
export function parseAlert(message: unknown): CardAlertResult {
	const msg = obj(message);
	const payload = obj(msg.payload);
	const headers = headersOf(payload);
	const entry = BY_SENDER.get(senderOf(headers));
	if (!entry) return IGNORED;
	const { network, parser } = entry;
	if (headerValue(headers, 'subject')?.trim() !== parser.subject) return IGNORED;
	if (!authenticated(headers, parser.domain)) return IGNORED;

	const parts = messageParts(msg, payload);
	if (!parts) return INVALID;
	const result = parser.parse(parts.html);
	if (result.status !== 'ok') return result;
	const { kind, type, ...fields } = result.alert;
	return {
		status: 'ok',
		alert: {
			...fields,
			gmailMessageId: parts.id,
			network,
			transactionType: storedType(kind, type),
			receivedAt: parts.receivedAt
		}
	};
}
