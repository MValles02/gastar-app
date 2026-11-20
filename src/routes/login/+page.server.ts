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
import { str } from '#lib/server/forms.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

const BAD_CREDENTIALS = 'Email o contraseña incorrectos.';

export const load: PageServerLoad = () => ({ googleEnabled });

export const actions: Actions = {
	login: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		const data = await request.formData();
		const email = str(data, 'email');
		const password = str(data, 'password');

		// Rate limit policy (b): count only failures.
		if (isBlocked('signIn', ip)) {
			return fail(429, { email, formError: tooManyAttempts('minuto') });
		}

		if (!email || !password) return fail(400, { email, passwordError: BAD_CREDENTIALS });

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
			return fail(400, { email, passwordError: BAD_CREDENTIALS });
		}

		redirect(303, '/');
	},

	google: googleAction,

	resend: resendAction
};
