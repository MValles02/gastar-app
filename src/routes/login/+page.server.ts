import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { isBlocked, record } from '$lib/server/rate-limit';
import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		if (isBlocked('signIn', ip)) {
			return fail(429, {
				email: '',
				formError: 'Demasiados intentos. Probá de nuevo en un minuto.'
			});
		}

		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
			return fail(400, {
				email: typeof email === 'string' ? email : '',
				passwordError: 'Email o contraseña incorrectos.'
			});
		}

		try {
			await auth.api.signInEmail({
				body: { email, password },
				headers: request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				// Correct password, unverified email: Better Auth already re-sent the link.
				if (err.body?.code === 'EMAIL_NOT_VERIFIED') return { checkEmail: email };
				record('signIn', ip);
				return fail(400, { email, passwordError: 'Email o contraseña incorrectos.' });
			}
			throw err;
		}

		redirect(303, '/');
	},

	// Always reports success so it cannot be used to probe which emails exist.
	resend: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		const email = (await request.formData()).get('email');
		if (typeof email !== 'string' || !email) return fail(400, { email: '' });

		if (!isBlocked('resend', ip)) {
			record('resend', ip);
			try {
				await auth.api.sendVerificationEmail({ body: { email, callbackURL: '/verify-email' } });
			} catch (err) {
				if (!(err instanceof APIError)) throw err;
			}
		}
		return { checkEmail: email };
	}
};
