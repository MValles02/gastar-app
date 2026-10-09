import { fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import {
	EMAIL_RE,
	ignoreApiError,
	isValidPasswordLength,
	resendAction,
	VERIFY_EMAIL_PATH
} from '$lib/server/auth-forms';
import { isBlocked, record } from '$lib/server/rate-limit';
import type { Actions } from './$types';

const NAME_MAX_LENGTH = 80;

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
		else if (name.length > NAME_MAX_LENGTH) errors.name = 'Usá un nombre de hasta 80 caracteres.';
		if (!EMAIL_RE.test(email)) errors.email = 'Email inválido.';
		if (!isValidPasswordLength(password)) errors.password = 'Mínimo 8 caracteres.';
		if (errors.name || errors.email || errors.password) {
			return fail(400, { name, email, errors });
		}

		record('signUp', ip);
		// Anti-enumeration: an existing email (the owner gets an email instead) and a failed
		// send both end in the same state as success.
		await ignoreApiError(() =>
			auth.api.signUpEmail({
				body: { name, email, password, callbackURL: VERIFY_EMAIL_PATH },
				headers: request.headers
			})
		);
		return { checkEmail: email };
	},

	resend: resendAction
};
