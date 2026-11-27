import { fail } from '@sveltejs/kit';
import { es } from '#lib/copy/es.ts';
import { isValidPasswordLength, userNameError } from '#lib/fields.ts';
import { auth, googleEnabled } from '#lib/server/auth.ts';
import {
	googleAction,
	ignoreApiError,
	readEmail,
	resendAction,
	VERIFY_EMAIL_PATH
} from '#lib/server/auth-forms.ts';
import { str } from '#lib/server/forms.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ googleEnabled });

export const actions: Actions = {
	signup: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		const data = await request.formData();
		const name = str(data, 'name').trim();
		const { email, emailError } = readEmail(data);
		const password = str(data, 'password');

		// Rate limit policy (c): count attempts that pass validation.
		if (isBlocked('signUp', ip)) {
			return fail(429, {
				name,
				email,
				formError: es.common.tooManyAttempts('rato')
			});
		}

		const errors: { name?: string; email?: string; password?: string } = {};
		errors.name = userNameError(name);
		errors.email = emailError;
		if (!isValidPasswordLength(password)) errors.password = es.common.fields.passwordMin;
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
