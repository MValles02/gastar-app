import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { CURRENCIES } from '$lib/money';
import { CURRENCY_COOKIE, safeRedirectTo } from '$lib/server/currency-pref';
import type { Actions } from './$types';

const ONE_YEAR_S = 60 * 60 * 24 * 365;
/** Pre-single-currency cookie, cleared whenever the preference is saved. */
const LEGACY_DASHBOARD_CURRENCY_COOKIE = 'dashboard_currency';

export const load = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const value = data.get('currency');

		if (typeof value !== 'string' || !(CURRENCIES as readonly string[]).includes(value)) {
			return fail(400, { currencyError: 'Moneda inválida.' });
		}

		cookies.set(CURRENCY_COOKIE, value, {
			path: '/',
			maxAge: ONE_YEAR_S,
			sameSite: 'lax',
			httpOnly: true,
			secure: !dev
		});
		cookies.delete(LEGACY_DASHBOARD_CURRENCY_COOKIE, { path: '/' });

		redirect(303, safeRedirectTo(data.get('redirectTo')));
	}
};
