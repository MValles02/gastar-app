import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { isBlocked, record } from '$lib/server/rate-limit';
import type { Actions } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const actions: Actions = {
	signup: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (isBlocked('signUp', ip)) {
			return fail(429, {
				name,
				email,
				formError: 'Demasiados intentos. Probá de nuevo en un rato.'
			});
		}

		const errors: { name?: string; email?: string; password?: string } = {};
		if (!name) errors.name = 'Falta el nombre.';
		else if (name.length > 80) errors.name = 'Usá un nombre de hasta 80 caracteres.';
		if (!EMAIL_RE.test(email)) errors.email = 'Email inválido.';
		if (password.length < 8 || password.length > 128) {
			errors.password = 'Mínimo 8 caracteres.';
		}
		if (errors.name || errors.email || errors.password) {
			return fail(400, { name, email, errors });
		}

		record('signUp', ip);
		try {
			await auth.api.signUpEmail({
				body: { name, email, password, callbackURL: '/verify-email' },
				headers: request.headers
			});
		} catch (err) {
			// Anti-enumeration: an existing email (the owner gets an email instead) and a failed
			// send both end in the same state as success.
			if (!(err instanceof APIError)) throw err;
		}
		return { checkEmail: email };
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
