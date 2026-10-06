/** `both` is accepted only for the previous release (start-first deploy overlap); drop it in a later release. */
export const CURRENCY_PREFS = ['ARS', 'USD', 'both'] as const;

/** The stored preference as a single currency: anything but `USD` (including legacy `both`) is ARS. */
export function singleCurrency(raw: string | null | undefined): 'ARS' | 'USD' {
	return raw === 'USD' ? 'USD' : 'ARS';
}

/** Same-origin relative paths only: start with `/` but not `//`; no control chars (browsers strip tab/CR/LF) or backslashes. */
export function safeRedirectTo(raw: unknown): string {
	if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/';
	// eslint-disable-next-line no-control-regex -- rejecting control characters is the point
	if (/[\u0000-\u001f\u007f\\]/.test(raw)) return '/';
	return raw;
}
