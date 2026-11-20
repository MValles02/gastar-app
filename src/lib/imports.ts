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

/** Card networks whose Gmail purchase alerts are read. */
export const CARD_NETWORKS = ['visa', 'mastercard'] as const;
export type CardNetwork = (typeof CARD_NETWORKS)[number];

export const isCardNetwork = (v: string): v is CardNetwork =>
	(CARD_NETWORKS as readonly string[]).includes(v);

const CARD_NETWORK_NAMES: Record<CardNetwork, string> = { visa: 'Visa', mastercard: 'Mastercard' };

/** A card network's display name ("Visa", "Mastercard"); an unknown one shows as is. */
export const cardNetworkName = (network: string) =>
	isCardNetwork(network) ? CARD_NETWORK_NAMES[network] : network;

/**
 * Per card network: `debitSource: null` means credit only (Galicia Mastercard); `reversals` means the network
 * sends purchase-reversal alerts.
 */
export const CARD_NETWORK_RULES: Record<
	CardNetwork,
	{ debitSource: SourceId | null; reversals: boolean }
> = {
	visa: { debitSource: SOURCE.visaDebit, reversals: false },
	mastercard: { debitSource: null, reversals: true }
};

export const CARD_TYPES = ['credit', 'debit'] as const;
export type CardType = (typeof CARD_TYPES)[number];
