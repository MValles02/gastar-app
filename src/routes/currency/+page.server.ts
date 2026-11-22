import { fail, redirect } from '@sveltejs/kit';
import { PREFERENCE_COOKIE_OPTIONS } from '#lib/server/cookies.ts';
import { isCurrency } from '#lib/money.ts';
import { CURRENCY_COOKIE, safeRedirectTo } from '#lib/server/currency-pref.ts';
import type { Actions } from './$types';

/** Pre-single-currency cookie, cleared whenever the preference is saved. */
const LEGACY_DASHBOARD_CURRENCY_COOKIE = 'dashboard_currency';

export const load = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const value = data.get('currency');

		if (!isCurrency(value)) {
			return fail(400, { currencyError: 'Moneda inválida.' });
		}

		cookies.set(CURRENCY_COOKIE, value, PREFERENCE_COOKIE_OPTIONS);
		cookies.delete(LEGACY_DASHBOARD_CURRENCY_COOKIE, { path: '/' });

		redirect(303, safeRedirectTo(data.get('redirectTo')));
	}
};
