// Client-safe import inbox shared values: relative imports only.

export const ALREADY_REVIEWED = 'Ese movimiento ya fue revisado.';

/** What the inbox says when "Descartar" or "Dejar" of an alert missing from its statement fails. */
export const UNMATCHED_FAILED = {
	discard: 'No se pudo descartar.',
	keep: 'No se pudo guardar.'
} as const;

/** The step a running Mercado Pago sync is on: payments first, then (when due) the release report. */
export type SyncPhase = 'payments' | 'report';

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

type NetworkSpec = {
	name: string;
	credit: { source: SourceId; label: string };
	/** `null`: credit only (Galicia Mastercard). */
	debit: { source: SourceId; label: string } | null;
	/** The network sends purchase-reversal alerts. */
	reversals: boolean;
};

/** Card networks whose Gmail purchase alerts are read, and what each says about its sources. */
export const CARD_NETWORK = {
	visa: {
		name: 'Visa',
		credit: { source: SOURCE.galiciaVisa, label: 'Galicia Visa' },
		debit: { source: SOURCE.visaDebit, label: 'Visa Débito' },
		reversals: false
	},
	mastercard: {
		name: 'Mastercard',
		credit: { source: SOURCE.galiciaMastercard, label: 'Galicia Mastercard' },
		debit: null,
		reversals: true
	}
} as const satisfies Record<string, NetworkSpec>;
export type CardNetwork = keyof typeof CARD_NETWORK;

export const CARD_NETWORKS = Object.keys(CARD_NETWORK) as CardNetwork[];

/** The Banco Galicia source of a card network's statements. */
export const GALICIA_SOURCE = Object.fromEntries(
	CARD_NETWORKS.map((n) => [n, CARD_NETWORK[n].credit.source])
) as { [N in CardNetwork]: (typeof CARD_NETWORK)[N]['credit']['source'] };

export const isCardNetwork = (v: string): v is CardNetwork =>
	(CARD_NETWORKS as readonly string[]).includes(v);

/** A card network's display name ("Visa", "Mastercard"); an unknown one shows as is. */
export const cardNetworkName = (network: string) =>
	isCardNetwork(network) ? CARD_NETWORK[network].name : network;

export const CARD_TYPES = ['credit', 'debit'] as const;
export type CardType = (typeof CARD_TYPES)[number];
