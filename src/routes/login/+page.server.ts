import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import { resendAction, VERIFY_EMAIL_PATH } from '#lib/server/auth-forms.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
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
				body: { email, password, callbackURL: VERIFY_EMAIL_PATH },
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

	resend: resendAction
};
