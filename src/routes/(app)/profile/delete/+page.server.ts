import { fail, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { auth } from '#lib/server/auth.ts';
import {
	googleReauthAction,
	ignoreApiError,
	isApiError,
	tooManyAttempts
} from '#lib/server/auth-forms.ts';
import { deleteUserAndData } from '#lib/server/delete-user.ts';
import { deletionSummary } from '#lib/server/profile-queries.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import { requireUser } from '#lib/server/guards.ts';
import { reauthMode } from '#lib/server/reauth.ts';
import type { Actions, PageServerLoad } from './$types';

/** What the confirmation lists: the user's real counts, so it says what is about to go. */
export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return {
		summary: await deletionSummary(user.id),
		reauthMode: await reauthMode(user.id, locals.session),
		email: user.email
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const userId = requireUser(locals).id;
		if (isBlocked('deleteAccount', userId)) {
			return formFail(429, { formError: tooManyAttempts('rato') });
		}

		const mode = await reauthMode(userId, locals.session);
		if (mode === 'password') {
			const password = String((await request.formData()).get('password') ?? '');
			if (!password) return formFail(400, { formError: 'Ingresá tu contraseña.' });

			try {
				await auth.api.verifyPassword({ body: { password }, headers: request.headers });
			} catch (err) {
				if (!isApiError(err)) throw err;
				record('deleteAccount', userId);
				return formFail(400, { formError: 'La contraseña no es correcta.' });
			}
		} else if (mode === 'stale') {
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
