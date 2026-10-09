import { fail, redirect } from '@sveltejs/kit';
import { resendVerification } from '$lib/server/auth-forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	// autoSignInAfterVerification: a valid link lands here already signed in.
	if (locals.user) redirect(303, '/');
	return { expired: url.searchParams.has('error') };
};

export const actions: Actions = {
	// Always reports success so it cannot be used to probe which emails exist.
	resend: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		const email = String((await request.formData()).get('email') ?? '').trim();
		if (!email) return fail(400, { emailError: 'Ingresá tu email.' });

		await resendVerification(email, ip);
		return { checkEmail: email };
	}
};
