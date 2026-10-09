import { dev } from '$app/environment';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Options shared by the long-lived preference cookies (currency, theme, last account). */
export const PREFERENCE_COOKIE_OPTIONS = {
	path: '/',
	maxAge: ONE_YEAR_SECONDS,
	sameSite: 'lax',
	httpOnly: true,
	secure: !dev
} as const;

export const THEME_COOKIE = 'theme';
