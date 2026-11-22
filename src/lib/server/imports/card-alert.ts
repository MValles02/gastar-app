// A card purchase alert as card_alerts stores it, whatever mail it was read from. Shared by the alert readers
// and the alert conversion (card-alerts.ts); nothing here reads mail.

import type { CardNetwork } from '#lib/imports.ts';
import type { Currency } from '#lib/money.ts';

/** What an alert records: a purchase, the reversal of one (it cancels an earlier purchase), or anything else. */
export type AlertKind = 'purchase' | 'reversal' | 'other';

/** The stored transaction_type of a purchase and of a reversal; any other type is stored as sent. */
export const STORED_TYPE = { purchase: 'Compra', reversal: 'Compra reversada' } as const;

/** The kind of a stored transaction_type. */
export const alertKind = (transactionType: string): AlertKind =>
	transactionType === STORED_TYPE.purchase
		? 'purchase'
		: transactionType === STORED_TYPE.reversal
			? 'reversal'
			: 'other';

/** The transaction_type to store: the fixed value of a purchase or reversal, else the type as sent. */
export const storedType = (kind: AlertKind, sent: string) =>
	kind === 'other' ? sent : STORED_TYPE[kind];

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
