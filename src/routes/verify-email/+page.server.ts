import { redirect } from '@sveltejs/kit';
import { resendAction } from '#lib/server/auth-forms.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url, request }) => {
	// autoSignInAfterVerification: a valid link lands here already signed in.
	if (locals.user) redirect(303, '/');
	// Better Auth sends failed links here with ?error=. A bare GET verified nothing; the resend POST
	// (no-JS, URL ?/resend) re-runs this load, as does an enhanced resend from that URL, and must
	// keep rendering the form.
	if (request.method === 'GET' && url.search === '') redirect(303, '/login');
};

export const actions: Actions = { resend: resendAction };
