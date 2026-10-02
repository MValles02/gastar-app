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
