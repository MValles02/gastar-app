import type { Cookies } from '@sveltejs/kit';
import type { Currency } from '$lib/money';

/** Cookie holding the user's single-currency preference (read with `preferredCurrency`). */
export const CURRENCY_COOKIE = 'currency';

/** The stored preference: anything but `USD` (including a missing or unknown cookie value) is ARS. */
export function preferredCurrency(cookies: Cookies): Currency {
	return cookies.get(CURRENCY_COOKIE) === 'USD' ? 'USD' : 'ARS';
}

/** Same-origin relative paths only: start with `/` but not `//`; no control chars (browsers strip tab/CR/LF) or backslashes. */
export function safeRedirectTo(raw: unknown): string {
	if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/';
	// eslint-disable-next-line no-control-regex -- rejecting control characters is the point
	if (/[\u0000-\u001f\u007f\\]/.test(raw)) return '/';
	return raw;
}
