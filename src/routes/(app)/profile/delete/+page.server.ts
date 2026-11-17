import { fail, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import { googleReauthAction, ignoreApiError } from '#lib/server/auth-forms.ts';
import { deleteUserAndData } from '#lib/server/delete-user.ts';
import { deletionSummary } from '#lib/server/profile-queries.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import { requireUser } from '#lib/server/guards.ts';
import { hasPassword, isRecentSession } from '#lib/server/reauth.ts';
import type { Actions, PageServerLoad } from './$types';

/** What the confirmation lists: the user's real counts, so it says what is about to go. */
export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return {
		summary: await deletionSummary(user.id),
		hasPassword: await hasPassword(user.id),
		recent: isRecentSession(locals.session),
		email: user.email
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const userId = requireUser(locals).id;
		if (isBlocked('deleteAccount', userId)) {
			return formFail(429, { formError: 'Demasiados intentos. Probá de nuevo en un rato.' });
		}

		if (await hasPassword(userId)) {
			const password = String((await request.formData()).get('password') ?? '');
			if (!password) return formFail(400, { formError: 'Ingresá tu contraseña.' });

			try {
				await auth.api.verifyPassword({ body: { password }, headers: request.headers });
			} catch (err) {
				if (!(err instanceof APIError)) throw err;
				record('deleteAccount', userId);
				return formFail(400, { formError: 'La contraseña no es correcta.' });
			}
		} else if (!isRecentSession(locals.session)) {
			return fail(400, {
				formError: 'Pasaron más de 5 minutos. Confirmá con Google de nuevo.',
				reauth: true
			});
		}

		await deleteUserAndData(userId);
		// The sessions are gone with the user; signing out clears the browser's auth cookies.
		await ignoreApiError(() => auth.api.signOut({ headers: request.headers }));
		redirect(303, '/login');
	},

	google: googleReauthAction('/profile/delete')
};
