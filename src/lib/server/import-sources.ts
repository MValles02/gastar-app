/**
 * What each import source (Mercado Pago, a Banco Galicia card network) says about its items: the kinds it
 * produces, how a merchant is named, how its dates read and how a re-import treats an existing item.
 * Everything that varies by source or kind lives here; callers ask, they never compare literals.
 */

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
	cardTaxes: 'card_taxes'
} as const;
type Kind = (typeof KIND)[keyof typeof KIND];

export const SOURCE = {
	mercadoPago: 'mercado_pago',
	galiciaVisa: 'galicia_visa',
	galiciaMastercard: 'galicia_mastercard'
} as const;
export type SourceId = (typeof SOURCE)[keyof typeof SOURCE];

type KindSpec = {
	/** Title when the item has no counterparty or merchant (else the raw description). */
	title?: string | { credit: string; debit: string };
	/** The title is "<title> · <who>" when there is a who. */
	titleWithWho?: true;
	/** Rules are never learned from this kind (`never`), or only from its debits (`debit`). */
	learns?: 'never' | 'debit';
	/** The kind itself is a rule key: always, only for credits, or only to look up (never remembered). */
	kindKey?: 'always' | 'credit' | 'lookup';
	/** Defaults to a transfer between own accounts. */
	transfer?: true;
	/** The default type is a guess: the page asks for a review. */
	review?: true;
};

type SourceSpec = {
	label: string;
	/** Re-importing an existing key: leave it (`skip`) or refresh it while it is still pending (`update`). */
	conflict: 'skip' | 'update';
	/** Items carry a time of day; otherwise only a day. */
	timed: boolean;
	/** The stable name of a merchant text: the title and the merchant rule key. */
	merchantName: (merchant: string | null) => string;
	kinds: Partial<Record<Kind, KindSpec>>;
};

/**
 * The stable name of a card statement reference, in its original casing ('' when nothing is left).
 * Drops: leading Visa markers (*, K, E); an embedded "USD 1.234,56" amount; NN/NN installment tokens;
 * a leading "MERPAGO*"; trailing per-transaction codes (5+ digits, or letters+digits of 6+ chars; a
 * code glued to 3+ letters keeps the letters). The last remaining token is always kept. Trailing
 * whitespace and , ; : * - / go; a trailing period and inner punctuation stay.
 */
function cardMerchantName(reference: string | null): string {
	const text = (reference ?? '')
		.trim()
		.replace(/^(?:[*KE]\s+)+/, '')
		.replace(/\s*USD\s*\d[\d.]*,\d{2}/gi, '')
		.replace(/(^|\s)\d{2}\/\d{2}(?=\s|$)/g, '$1')
		.replace(/^\s*MERPAGO\s*\*\s*/i, '');
	const tokens = text.split(/\s+/).filter(Boolean);
	while (tokens.length > 1) {
		const last = tokens[tokens.length - 1];
		const glued = /^([A-Za-z]{3,})\d{5,}$/.exec(last);
		if (glued) {
			tokens[tokens.length - 1] = glued[1];
			break;
		}
		if (/^\d{5,}$/.test(last) || /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9]{6,}$/.test(last)) tokens.pop();
		else break;
	}
	return tokens.join(' ').replace(/[\s,;:*\-/]+$/, '');
}

const cardKinds: SourceSpec['kinds'] = {
	// A credit line is a reversed purchase: learning from it would overwrite the purchase's rule.
	[KIND.cardPurchase]: { learns: 'debit' },
	[KIND.cardInstallment]: { learns: 'debit' },
	[KIND.cardTaxes]: { title: 'Impuestos y percepciones', kindKey: 'always' }
};

const card = (label: string): SourceSpec => ({
	label,
	conflict: 'skip',
	timed: false,
	merchantName: cardMerchantName,
	kinds: cardKinds
});

const SOURCES: Record<SourceId, SourceSpec> = {
	[SOURCE.mercadoPago]: {
		label: 'Mercado Pago',
		conflict: 'update',
		timed: true,
		merchantName: (m) => m?.trim() ?? '',
		kinds: {
			[KIND.payment]: { title: { credit: 'Transferencia recibida', debit: 'Pago' } },
			// A refund reverses its payment: learning from it would overwrite the payment's rule.
			[KIND.refund]: { title: 'Devolución', titleWithWho: true, learns: 'never' },
			// A net-negative yield day must not share (and overwrite) the rule learned from the usual positive ones.
			[KIND.yield]: { title: 'Rendimientos', kindKey: 'credit' },
			// Payouts vary too much for one rule over the whole kind to be worth remembering.
			[KIND.payout]: { title: 'Transferencia o retiro', kindKey: 'lookup', transfer: true },
			[KIND.merchantPayout]: { title: 'Pago en comercio', kindKey: 'lookup' },
			[KIND.accountFund]: { title: 'Ingreso de dinero', kindKey: 'always', transfer: true },
			[KIND.other]: { review: true }
		}
	},
	[SOURCE.galiciaVisa]: card('Galicia Visa'),
	[SOURCE.galiciaMastercard]: card('Galicia Mastercard')
};

/** The source of a stored item (its column is constrained to the three ids). */
export const importSource = (source: string): SourceSpec => SOURCES[source as SourceId];

export const kindSpec = (source: string, kind: string): KindSpec =>
	importSource(source).kinds[kind as Kind] ?? {};

/** Fixed title of a kind without a counterparty, for the items that need it (taxes line). */
export const kindTitle = (source: SourceId, kind: Kind) => {
	const t = SOURCES[source].kinds[kind]?.title;
	return typeof t === 'string' ? t : '';
};
