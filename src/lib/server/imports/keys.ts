import { sql, type AnyColumn } from 'drizzle-orm';

// Every import item's external key format. An external key is unique per user, whatever the source, so the
// strings here must never change: an existing item would be imported again under a new key.

/** A Gmail card alert's item (or the alias of the statement item it matched). */
export const alertKey = (messageId: string) => `alert:${messageId}`;
/** LIKE pattern of every alert key. */
export const ALERT_KEYS = 'alert:%';
export const alertKeySql = (messageId: AnyColumn) => sql`'alert:' || ${messageId}`;

type StatementLineParts = {
	network: string;
	voucher: string | null;
	installment: string | null;
	/** Purchase day, `YYYY-MM-DD`. */
	date: string;
	currency: string;
	cents: number;
};

/**
 * A Banco Galicia statement line: galicia:<network>:<voucher>:<cuota>:<date>:<currency>:<cents>, with `#n` for
 * the n-th identical line of one statement (n > 1).
 */
export function statementLineKey(p: StatementLineParts, n: number): string {
	const base = [
		'galicia',
		p.network,
		p.voucher ?? '',
		p.installment ?? '',
		p.date,
		p.currency,
		p.cents
	].join(':');
	return n === 1 ? base : `${base}#${n}`;
}
/** The purchase day (`YYYY-MM-DD`) of a statementLineKey: its fifth part. */
export const statementPurchaseDay = (key: string) => key.split(':')[4];
/** LIKE pattern of every statement key (lines and taxes). */
export const STATEMENT_KEYS = 'galicia:%';
/** A statement's taxes item for one currency. */
export const statementTaxesKey = (network: string, numberHash: string, currency: string) =>
	['galicia', network, 'taxes', numberHash, currency].join(':');
/** "Diferencia con el resumen" of a reviewed alert item and its statement line. */
export const diffKey = (lineKey: string) => `diff:${lineKey}`;

/** Mercado Pago: a payment, incoming or outgoing. */
export const paymentKey = (id: string, isCredit: boolean) =>
	`payment:${id}:${isCredit ? 'in' : 'out'}`;
/** Mercado Pago: the refund of a payment (the opposite direction). */
export const refundKey = (id: string, isCredit: boolean) =>
	`refund:${id}:${isCredit ? 'out' : 'in'}`;
/** Mercado Pago: a day's netted yield. */
export const yieldKey = (day: string) => `yield:${day}`;
/** Mercado Pago: a payout. */
export const payoutKey = (id: string) => `payout:${id}:out`;
