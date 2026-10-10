import { fail, redirect } from '@sveltejs/kit';
import { resendVerification } from '$lib/server/auth-forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url, request }) => {
	// autoSignInAfterVerification: a valid link lands here already signed in.
	if (locals.user) redirect(303, '/');
	// Better Auth sends failed links here with ?error=. A bare GET verified nothing; the resend POST
	// (no-JS, URL ?/resend) re-runs this load, as does an enhanced resend from that URL, and must
	// keep rendering the form.
	if (request.method === 'GET' && url.search === '') redirect(303, '/login');
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
