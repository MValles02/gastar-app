import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { isBlocked, record } from '$lib/server/rate-limit';
import type { Actions, RequestEvent } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Always reports success (same state for unknown email, rate limit or failed send) so it
// cannot be used to probe which emails exist. Every attempt is recorded.
async function requestReset({ request, getClientAddress }: RequestEvent) {
	const ip = getClientAddress();
	const email = String((await request.formData()).get('email') ?? '').trim();
	if (!EMAIL_RE.test(email)) return fail(400, { email, emailError: 'Email inválido.' });

	const key = email.toLowerCase();
	const blocked = isBlocked('resetRequestIp', ip) || isBlocked('resetRequestEmail', key);
	record('resetRequestIp', ip);
	record('resetRequestEmail', key);
	if (!blocked) {
		try {
			await auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } });
		} catch (err) {
			if (!(err instanceof APIError)) throw err;
		}
	}
	return { checkEmail: email };
}

export const actions: Actions = { request: requestReset, resend: requestReset };
