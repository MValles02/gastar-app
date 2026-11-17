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
