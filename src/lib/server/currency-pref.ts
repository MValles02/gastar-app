import type { Currency } from '$lib/money';

/** The stored preference as a currency: anything but `USD` (including an unknown cookie value) is ARS. */
export function singleCurrency(raw: string | null | undefined): Currency {
	return raw === 'USD' ? 'USD' : 'ARS';
}

/** Same-origin relative paths only: start with `/` but not `//`; no control chars (browsers strip tab/CR/LF) or backslashes. */
export function safeRedirectTo(raw: unknown): string {
	if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/';
	// eslint-disable-next-line no-control-regex -- rejecting control characters is the point
	if (/[\u0000-\u001f\u007f\\]/.test(raw)) return '/';
	return raw;
}
