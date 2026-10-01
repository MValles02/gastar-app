import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { isLoginBlocked, recordLoginFailure } from '$lib/server/login-limit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		if (isLoginBlocked(ip)) {
			return fail(429, { email: '', error: 'Demasiados intentos. Probá de nuevo en un minuto.' });
		}

		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
			return fail(400, {
				email: typeof email === 'string' ? email : '',
				error: 'Email o contraseña incorrectos.'
			});
		}

		try {
			await auth.api.signInEmail({
				body: { email, password },
				headers: request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				recordLoginFailure(ip);
				return fail(400, { email, error: 'Email o contraseña incorrectos.' });
			}
			throw err;
		}

		redirect(303, '/');
	}
};
