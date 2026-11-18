import { fail, redirect } from '@sveltejs/kit';
import { auth, googleEnabled } from '#lib/server/auth.ts';
import {
	EMAIL_NOT_VERIFIED,
	googleAction,
	isApiError,
	resendAction,
	tooManyAttempts,
	VERIFY_EMAIL_PATH
} from '#lib/server/auth-forms.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ googleEnabled });

export const actions: Actions = {
	login: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (isBlocked('signIn', ip)) {
			return fail(429, {
				email: typeof email === 'string' ? email : '',
				formError: tooManyAttempts('minuto')
			});
		}

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
			// Correct password, unverified email: Better Auth already re-sent the link.
			if (isApiError(err, EMAIL_NOT_VERIFIED)) return { checkEmail: email };
			if (!isApiError(err)) throw err;
			record('signIn', ip);
			return fail(400, { email, passwordError: 'Email o contraseña incorrectos.' });
		}

		redirect(303, '/');
	},

	google: googleAction,

	resend: resendAction
};
