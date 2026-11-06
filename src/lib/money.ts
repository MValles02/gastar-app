import { LOCALE } from './locale';

export const CURRENCIES = ['ARS', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Spanish plural name used in running copy ("en pesos", "en dólares"). */
export const CURRENCY_NAME = { ARS: 'pesos', USD: 'dólares' } as const satisfies Record<
	Currency,
	string
>;

const intFmt = new Intl.NumberFormat(LOCALE);

/** Unsigned display ("$1.234", "US$1.234,56"; no space after the symbol): direction is shown by colour, never by a sign. */
export function formatMoney(cents: number, currency: Currency): string {
	// ARS is shown in whole pesos (rounded half up on the magnitude); only USD shows cents.
	const abs = currency === 'ARS' ? Math.round(Math.abs(cents) / 100) * 100 : Math.abs(cents);
	const int = intFmt.format(Math.trunc(abs / 100));
	const dec = currency === 'USD' ? `,${String(abs % 100).padStart(2, '0')}` : '';
	const symbol = currency === 'USD' ? 'US$' : '$';
	return `${symbol}${int}${dec}`;
}

export const ARS_WHOLE_MESSAGE = 'Los montos en pesos van sin decimales.';
export const AMOUNT_EXAMPLE = '(ej.: 1.234 en pesos o 1.234,56 en dólares)';

/** ARS amounts (and exchange rates, which are in ARS) are whole pesos; USD may have cents. */
export const isWholeFor = (cents: number, currency: Currency) =>
	currency === 'USD' || cents % 100 === 0;

/** True for a usable exchange rate: positive and whole pesos (integer hundredths of "1 USD = X ARS"). */
export const isValidRate = (rate: number | null): rate is number =>
	rate !== null && rate > 0 && isWholeFor(rate, 'ARS');

const AMOUNT_RE = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;
/** Integer digits accepted by parseAmount; keeps the cents within Number.MAX_SAFE_INTEGER. */
const MAX_INT_DIGITS = 13;

/** Parses es-AR user input ("-1.234,56") into integer cents; null when invalid. */
export function parseAmount(input: string): number | null {
	const m = AMOUNT_RE.exec(input.trim());
	if (!m) return null;
	const int = m[2].replaceAll('.', '');
	if (int.length > MAX_INT_DIGITS) return null;
	const cents = Number(int) * 100 + Number((m[3] ?? '').padEnd(2, '0'));
	return cents === 0 ? 0 : m[1] ? -cents : cents;
}

/** True when the es-AR input parses to a strictly positive amount. */
export const isPositiveAmount = (input: string) => (parseAmount(input) ?? 0) > 0;

/**
 * Cents to an editable string with "." thousands grouping: "-1.234" (whole ARS) or "-1.234,56".
 * Never rounds, so editing shows the exact stored value; round-trips with parseAmount.
 */
export function formatAmountInput(cents: number, currency: Currency): string {
	const abs = Math.abs(cents);
	const dec = currency === 'ARS' && abs % 100 === 0 ? '' : `,${String(abs % 100).padStart(2, '0')}`;
	const int = String(Math.trunc(abs / 100)).replace(/\B(?=(\d{3})+$)/g, '.');
	return `${cents < 0 ? '-' : ''}${int}${dec}`;
}

/**
 * Converts integer cents between currencies at `rate` (integer hundredths of "1 USD = X ARS"),
 * rounding half up (to whole pesos into ARS), BigInt only; half-up holds for amount, rate >= 0
 * (callers guarantee > 0). Null when the result exceeds Number.MAX_SAFE_INTEGER.
 */
export function convertAmount(
	amount: number,
	rate: number,
	from: Currency,
	to: Currency
): number | null {
	if (from === to) return amount;
	const a = BigInt(amount);
	const r = BigInt(rate);
	const out = from === 'USD' ? ((a * r + 5000n) / 10000n) * 100n : (2n * a * 100n + r) / (2n * r);
	return out > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(out);
}

/**
 * Converts what the user typed (es-AR amount and rate strings) between currencies; null when
 * either is invalid or not positive. Unlike isValidRate, a fractional-peso rate still converts.
 */
export function convertInput(
	amount: string,
	rate: string,
	from: Currency,
	to: Currency
): number | null {
	const a = parseAmount(amount);
	const r = parseAmount(rate);
	if (a === null || a <= 0 || r === null || r <= 0) return null;
	return convertAmount(a, r, from, to);
}
