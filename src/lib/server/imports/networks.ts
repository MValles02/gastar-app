import type { CardNetwork } from '#lib/imports.ts';
import type { AlertParser } from './gmail/alert-mail';
import { mastercardAlert } from './gmail/mastercard-alert';
import { visaAlert } from './gmail/visa-alert';

/** Per card network, the server side of reading it: its Gmail alert parser and how a Galicia statement names it. */
export const NETWORK_IMPORT: Record<CardNetwork, { alert: AlertParser; statementMark: RegExp }> = {
	visa: { alert: visaAlert, statementMark: /VISA/i },
	mastercard: { alert: mastercardAlert, statementMark: /MASTERCARD/i }
};
