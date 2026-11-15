import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { APIError } from 'better-auth/api';
import { PASSWORD_MIN_MESSAGE } from '#lib/fields.ts';
import { auth } from '#lib/server/auth.ts';
import { isValidPasswordLength } from '#lib/server/auth-forms.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const userId = requireUser(locals).id;
		if (isBlocked('changePassword', userId)) {
			return formFail(429, { formError: 'Demasiados intentos. Probá de nuevo en un rato.' });
		}

		const data = await request.formData();
		const currentPassword = String(data.get('currentPassword') ?? '');
		const newPassword = String(data.get('newPassword') ?? '');

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
	}
};
