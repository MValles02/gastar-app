const NBSP = '\u00A0';
const intFmt = new Intl.NumberFormat('es-AR');

export function formatMoney(
	cents: number,
	currency: 'ARS' | 'USD',
	opts: { sign?: 'auto' | 'always' } = {}
): string {
	const abs = Math.abs(cents);
	const int = intFmt.format(Math.trunc(abs / 100));
	const dec = String(abs % 100).padStart(2, '0');
	const symbol = currency === 'USD' ? 'US$' : '$';
	const sign = cents < 0 ? '-' : cents > 0 && opts.sign === 'always' ? '+' : '';
	return `${sign}${symbol}${NBSP}${int},${dec}`;
}

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

/** Cents to an editable string without grouping ("-1234,56"); round-trips with parseAmount. */
export function formatAmountInput(cents: number): string {
	const abs = Math.abs(cents);
	const dec = String(abs % 100).padStart(2, '0');
	return `${cents < 0 ? '-' : ''}${Math.trunc(abs / 100)},${dec}`;
}

/**
 * Converts integer cents between currencies at `rate` (integer hundredths of "1 USD = X ARS"),
 * rounding half up, BigInt only. Null when the result exceeds Number.MAX_SAFE_INTEGER.
 */
export function convertAmount(
	amount: number,
	rate: number,
	from: 'ARS' | 'USD',
	to: 'ARS' | 'USD'
): number | null {
	if (from === to) return amount;
	const a = BigInt(amount);
	const r = BigInt(rate);
	const out = from === 'USD' ? (a * r + 50n) / 100n : (2n * a * 100n + r) / (2n * r);
	return out > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(out);
}
