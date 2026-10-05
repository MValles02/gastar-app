export const CURRENCY_PREFS = ['ARS', 'USD', 'both'] as const;
export type CurrencyPref = (typeof CURRENCY_PREFS)[number];

export function parseCurrencyPref(raw: string | null | undefined): CurrencyPref {
	return (CURRENCY_PREFS as readonly string[]).includes(raw ?? '') ? (raw as CurrencyPref) : 'both';
}

/** Same-origin relative paths only: start with `/` but not `//`; no control chars (browsers strip tab/CR/LF) or backslashes. */
export function safeRedirectTo(raw: unknown): string {
	if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/';
	// eslint-disable-next-line no-control-regex -- rejecting control characters is the point
	if (/[\u0000-\u001f\u007f\\]/.test(raw)) return '/';
	return raw;
}
