import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { ignoreApiError } from '$lib/server/auth-forms';
import { deleteUserAndData } from '$lib/server/delete-user';
import { deletionSummary } from '$lib/server/profile-queries';
import { isBlocked, record } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

/** What the confirmation lists: the user's real counts, so it says what is about to go. */
export const load: PageServerLoad = async ({ locals }) => ({
	summary: await deletionSummary(locals.user!.id)
});

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		if (isBlocked('deleteAccount', userId)) {
			return fail(429, { error: 'Demasiados intentos. Probá de nuevo en un rato.' });
		}

		const password = String((await request.formData()).get('password') ?? '');
		if (!password) return fail(400, { error: 'Ingresá tu contraseña.' });

		try {
			await auth.api.verifyPassword({ body: { password }, headers: request.headers });
		} catch (err) {
			if (!(err instanceof APIError)) throw err;
			record('deleteAccount', userId);
			return fail(400, { error: 'La contraseña no es correcta.' });
		}

		await deleteUserAndData(userId);
		// The sessions are gone with the user; signing out clears the browser's auth cookies.
		await ignoreApiError(() => auth.api.signOut({ headers: request.headers }));
		redirect(303, '/login');
	}
};
