import {
	GALICIA_SOURCE,
	KIND,
	SOURCE,
	SOURCE_LABELS,
	type Kind,
	type SourceId
} from '#lib/imports.ts';

export { GALICIA_SOURCE, KIND, SOURCE, type Kind, type SourceId };

/**
 * What each import source (Mercado Pago, a Banco Galicia card network) says about its items: the kinds it
 * produces, how a merchant is named, how its dates read and how a re-import treats an existing item.
 * Everything that varies by source or kind lives here; callers ask, they never compare literals.
 */

/** Kinds whose items come from payments/search; their latest date is where the next search starts. */
export const PAYMENT_KINDS: Kind[] = [KIND.payment, KIND.accountFund, KIND.refund];

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
	label: (typeof SOURCE_LABELS)[SourceId];
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
 * a leading "MERPAGO*"; a trailing run of 3+ masking lowercase x (Visa alerts: "MABERONxxxx");
 * trailing per-transaction codes (5+ digits, or letters+digits of 6+ chars; a code glued to 3+ letters
 * keeps the letters). The last remaining token is always kept. Trailing whitespace and , ; : * - / go;
 * a trailing period and inner punctuation stay.
 */
function cardMerchantName(reference: string | null): string {
	const text = (reference ?? '')
		.trim()
		.replace(/^(?:[*KE]\s+)+/, '')
		.replace(/\s*USD\s*\d[\d.]*,\d{2}/gi, '')
		.replace(/(^|\s)\d{2}\/\d{2}(?=\s|$)/g, '$1')
		.replace(/^\s*MERPAGO\s*\*\s*/i, '')
		.replace(/(?<=\S)x{3,}$/, '');
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
	[KIND.cardTaxes]: { title: 'Impuestos y percepciones', kindKey: 'always' },
	// The difference between a card alert and its statement line: a debit reuses the merchant's rule, a credit waits.
	[KIND.cardAdjustment]: {
		title: 'Diferencia con el resumen',
		titleWithWho: true,
		learns: 'debit'
	},
	// A credit alert whose type is not "Compra" is only a guess: it asks for a review and learns nothing.
	[KIND.other]: { review: true, learns: 'never' }
};

const card = (id: SourceId): SourceSpec => ({
	label: SOURCE_LABELS[id],
	conflict: 'skip',
	timed: false,
	merchantName: cardMerchantName,
	kinds: cardKinds
});

const SOURCES: Record<SourceId, SourceSpec> = {
	[SOURCE.mercadoPago]: {
		label: SOURCE_LABELS[SOURCE.mercadoPago],
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
	[SOURCE.galiciaVisa]: card(SOURCE.galiciaVisa),
	[SOURCE.galiciaMastercard]: card(SOURCE.galiciaMastercard),
	// Gmail alerts of a debit card, timed. A type other than "Compra" is only a guess: it asks for a review
	// and learns nothing, so no rule suggests it and it is never auto-approved.
	[SOURCE.visaDebit]: {
		label: SOURCE_LABELS[SOURCE.visaDebit],
		conflict: 'skip',
		timed: true,
		merchantName: cardMerchantName,
		kinds: {
			[KIND.cardPurchase]: { learns: 'debit' },
			[KIND.other]: { review: true, learns: 'never' }
		}
	}
};

export const importSource = (source: SourceId): SourceSpec => SOURCES[source];

export const kindSpec = (source: SourceId, kind: Kind): KindSpec =>
	importSource(source).kinds[kind] ?? {};
