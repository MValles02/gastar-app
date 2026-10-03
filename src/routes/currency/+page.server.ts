import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { CURRENCY_PREFS, safeRedirectTo } from '$lib/server/currency-pref';
import type { Actions } from './$types';

export const load = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const value = data.get('currency');

		if (typeof value !== 'string' || !(CURRENCY_PREFS as readonly string[]).includes(value)) {
			return fail(400, { error: 'Moneda inválida.' });
		}

		cookies.set('currency', value, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			sameSite: 'lax',
			httpOnly: true,
			secure: !dev
		});
		cookies.delete('dashboard_currency', { path: '/' });

		redirect(303, safeRedirectTo(data.get('redirectTo')));
	}
};
