// Client-safe import inbox shared values: relative imports only.

export const ALREADY_REVIEWED = 'Ese movimiento ya fue revisado.';

/** The step a running Mercado Pago sync is on: payments first, then (when due) the release report. */
export type SyncPhase = 'payments' | 'report';

export const SOURCE_LABELS = {
	mercado_pago: 'Mercado Pago',
	galicia_visa: 'Galicia Visa',
	galicia_mastercard: 'Galicia Mastercard',
	visa_debit: 'Visa Débito'
} as const;

export const KIND = {
	payment: 'payment',
	accountFund: 'account_fund',
	yield: 'yield',
	payout: 'payout',
	merchantPayout: 'merchant_payout',
	refund: 'refund',
	other: 'other',
	cardPurchase: 'card_purchase',
	cardInstallment: 'card_installment',
	cardTaxes: 'card_taxes',
	cardAdjustment: 'card_adjustment'
} as const;
export type Kind = (typeof KIND)[keyof typeof KIND];

export const SOURCE = {
	mercadoPago: 'mercado_pago',
	galiciaVisa: 'galicia_visa',
	galiciaMastercard: 'galicia_mastercard',
	visaDebit: 'visa_debit'
} as const;
export type SourceId = (typeof SOURCE)[keyof typeof SOURCE];

/** The Banco Galicia source of a card network's statements. */
export const GALICIA_SOURCE = {
	visa: SOURCE.galiciaVisa,
	mastercard: SOURCE.galiciaMastercard
} as const;

export const CARD_TYPES = ['credit', 'debit'] as const;
export type CardType = (typeof CARD_TYPES)[number];
