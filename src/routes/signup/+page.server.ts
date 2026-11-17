import { fail } from '@sveltejs/kit';
import { PASSWORD_MIN_MESSAGE } from '#lib/fields.ts';
import { auth, googleEnabled } from '#lib/server/auth.ts';
import {
	EMAIL_RE,
	googleAction,
	ignoreApiError,
	isValidPasswordLength,
	resendAction,
	userNameError,
	VERIFY_EMAIL_PATH
} from '#lib/server/auth-forms.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ googleEnabled });

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
		errors.name = userNameError(name);
		if (!EMAIL_RE.test(email)) errors.email = 'Email inválido.';
		if (!isValidPasswordLength(password)) errors.password = PASSWORD_MIN_MESSAGE;
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

	google: googleAction,

	resend: resendAction
};
