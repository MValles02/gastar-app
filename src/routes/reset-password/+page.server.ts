import { fail, redirect } from '@sveltejs/kit';
import { PASSWORD_MIN_MESSAGE } from '#lib/fields.ts';
import { auth } from '#lib/server/auth.ts';
import { isApiError, isValidPasswordLength } from '#lib/server/auth-forms.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const token = url.searchParams.get('token');
	return { token: token ?? '', expired: !token || url.searchParams.has('error') };
};

export const actions: Actions = {
	reset: async ({ request }) => {
		const data = await request.formData();
		const token = String(data.get('token') ?? '');
		const password = String(data.get('password') ?? '');

		if (!token) return fail(400, { expired: true });
		if (!isValidPasswordLength(password)) {
			return fail(400, { passwordError: PASSWORD_MIN_MESSAGE });
		}

		try {
			await auth.api.resetPassword({ body: { newPassword: password, token } });
		} catch (err) {
			if (!isApiError(err)) throw err;
			// Invalid, expired or already used token.
			return fail(400, { expired: true });
		}
		redirect(303, '/login?reset=1');
	}
};
