import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { userNameError } from '$lib/server/auth-forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({ name: locals.user!.name });

export const actions: Actions = {
	default: async ({ request }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		const error = userNameError(name);
		if (error) return fail(400, { name, error });

		await auth.api.updateUser({ body: { name }, headers: request.headers });
		redirect(303, '/profile');
	}
};
