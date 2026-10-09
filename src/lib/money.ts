import { LOCALE } from './locale';

export const CURRENCIES = ['ARS', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

const NBSP = '\u00A0';
const intFmt = new Intl.NumberFormat(LOCALE);

/** Unsigned display ("$ 1.234", "US$ 1.234,56"): direction is shown by colour, never by a sign. */
export function formatMoney(cents: number, currency: Currency): string {
	// ARS is shown in whole pesos (rounded half up on the magnitude); only USD shows cents.
	const abs = currency === 'ARS' ? Math.round(Math.abs(cents) / 100) * 100 : Math.abs(cents);
	const int = intFmt.format(Math.trunc(abs / 100));
	const dec = currency === 'USD' ? `,${String(abs % 100).padStart(2, '0')}` : '';
	const symbol = currency === 'USD' ? 'US$' : '$';
	return `${symbol}${NBSP}${int}${dec}`;
}

export const ARS_WHOLE_MESSAGE = 'Los montos en pesos van sin decimales.';
export const AMOUNT_EXAMPLE = '(ej.: 1.234 en pesos o 1.234,56 en dólares)';

/** ARS amounts (and exchange rates, which are in ARS) are whole pesos; USD may have cents. */
export const isWholeFor = (cents: number, currency: Currency) =>
	currency === 'USD' || cents % 100 === 0;

const AMOUNT_RE = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/** Parses es-AR user input ("-1.234,56") into integer cents; null when invalid. */
export function parseAmount(input: string): number | null {
	const m = AMOUNT_RE.exec(input.trim());
	if (!m) return null;
	const int = m[2].replaceAll('.', '');
	if (int.length > 13) return null;
	const cents = Number(int) * 100 + Number((m[3] ?? '').padEnd(2, '0'));
	return cents === 0 ? 0 : m[1] ? -cents : cents;
}

/**
 * Cents to an editable string without grouping: "-1234" (whole ARS) or "-1234,56". Never rounds,
 * so editing shows the exact stored value; round-trips with parseAmount.
 */
export function formatAmountInput(cents: number, currency: Currency): string {
	const abs = Math.abs(cents);
	const dec = currency === 'ARS' && abs % 100 === 0 ? '' : `,${String(abs % 100).padStart(2, '0')}`;
	return `${cents < 0 ? '-' : ''}${Math.trunc(abs / 100)}${dec}`;
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
