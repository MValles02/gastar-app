import { fail } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import { EMAIL_RE, ignoreApiError } from '#lib/server/auth-forms.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import type { Actions, RequestEvent } from './$types';

// Always reports success (same state for unknown email, rate limit or failed send) so it
// cannot be used to probe which emails exist. Every attempt is recorded.
async function requestReset({ request, getClientAddress }: RequestEvent) {
	const ip = getClientAddress();
	const email = String((await request.formData()).get('email') ?? '').trim();
	if (!EMAIL_RE.test(email)) return fail(400, { email, emailError: 'Email inválido.' });

	const key = email.toLowerCase();
	// Rate limit policy (d): check both buckets, then record both even when blocked.
	const blocked = isBlocked('resetRequestIp', ip) || isBlocked('resetRequestEmail', key);
	record('resetRequestIp', ip);
	record('resetRequestEmail', key);
	if (!blocked) {
		await ignoreApiError(() =>
			auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } })
		);
	}
	return { checkEmail: email };
}

export const actions: Actions = { request: requestReset, resend: requestReset };
