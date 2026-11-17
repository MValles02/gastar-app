import { fail, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { APIError } from 'better-auth/api';
import { PASSWORD_MIN_MESSAGE } from '#lib/fields.ts';
import { auth } from '#lib/server/auth.ts';
import { googleReauthAction, isValidPasswordLength } from '#lib/server/auth-forms.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import { requireUser } from '#lib/server/guards.ts';
import { hasPassword, isRecentSession } from '#lib/server/reauth.ts';
import type { Actions, PageServerLoad } from './$types';

/** A Google-only user creates a password instead of changing one, after a recent sign-in. */
export const load: PageServerLoad = async ({ locals }) => ({
	hasPassword: await hasPassword(requireUser(locals).id),
	recent: isRecentSession(locals.session)
});

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = requireUser(locals).id;
		if (isBlocked('changePassword', userId)) {
			return formFail(429, { formError: 'Demasiados intentos. Probá de nuevo en un rato.' });
		}

		const data = await request.formData();
		const newPassword = String(data.get('newPassword') ?? '');

		if (!(await hasPassword(userId))) {
			if (!isRecentSession(locals.session)) {
				return fail(400, {
					formError: 'Por seguridad, confirmá con Google antes de crear la contraseña.',
					reauth: true
				});
			}
			if (!isValidPasswordLength(newPassword)) {
				return formFail(400, { errors: { next: PASSWORD_MIN_MESSAGE } });
			}
			try {
				await auth.api.setPassword({ body: { newPassword }, headers: request.headers });
			} catch (err) {
				if (!(err instanceof APIError)) throw err;
				return formFail(400, { formError: 'No pudimos crear la contraseña. Probá de nuevo.' });
			}
			redirect(303, '/profile');
		}

		const currentPassword = String(data.get('currentPassword') ?? '');

		const errors: { current?: string; next?: string } = {};
		if (!currentPassword) errors.current = 'Ingresá tu contraseña actual.';
		if (!isValidPasswordLength(newPassword)) errors.next = PASSWORD_MIN_MESSAGE;
		if (errors.current || errors.next) return formFail(400, { errors });

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: true },
				headers: request.headers
			});
		} catch (err) {
			if (!(err instanceof APIError)) throw err;
			if (err.body?.code === 'INVALID_PASSWORD') {
				record('changePassword', userId);
				errors.current = 'La contraseña actual no es correcta.';
				return formFail(400, { errors });
			}
			return formFail(400, { formError: 'No pudimos cambiar la contraseña. Probá de nuevo.' });
		}

		redirect(303, '/profile');
	},

	google: googleReauthAction('/profile/password')
};
