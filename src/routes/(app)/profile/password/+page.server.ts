import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { isValidPasswordLength, PASSWORD_MIN_MESSAGE } from '#lib/fields.ts';
import { auth } from '#lib/server/auth.ts';
import {
	googleReauthAction,
	INVALID_PASSWORD,
	isApiError,
	reauthGate
} from '#lib/server/auth-forms.ts';
import { str } from '#lib/server/forms.ts';
import { requireUser } from '#lib/server/guards.ts';
import { reauthMode } from '#lib/server/reauth.ts';
import type { Actions, PageServerLoad } from './$types';

/** A Google-only user creates a password instead of changing one, after a recent sign-in. */
export const load: PageServerLoad = async ({ locals }) => ({
	reauthMode: await reauthMode(requireUser(locals).id, locals.session)
});

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = requireUser(locals).id;
		const gate = await reauthGate(userId, locals.session, {
			limit: 'changePassword',
			staleMessage: 'Por seguridad, confirmá con Google antes de crear la contraseña.'
		});
		if ('failure' in gate) return gate.failure;

		const data = await request.formData();
		const newPassword = str(data, 'newPassword');

		if (gate.mode === 'recent') {
			if (!isValidPasswordLength(newPassword)) {
				return formFail(400, { errors: { next: PASSWORD_MIN_MESSAGE } });
			}
			try {
				await auth.api.setPassword({ body: { newPassword }, headers: request.headers });
			} catch (err) {
				if (!isApiError(err)) throw err;
				return formFail(400, { formError: 'No pudimos crear la contraseña. Probá de nuevo.' });
			}
			redirect(303, '/profile');
		}

		const currentPassword = str(data, 'currentPassword');

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
			if (!isApiError(err)) throw err;
			if (isApiError(err, INVALID_PASSWORD)) {
				gate.recordFailure();
				errors.current = 'La contraseña actual no es correcta.';
				return formFail(400, { errors });
			}
			return formFail(400, { formError: 'No pudimos cambiar la contraseña. Probá de nuevo.' });
		}

		redirect(303, '/profile');
	},

	google: googleReauthAction('/profile/password')
};
