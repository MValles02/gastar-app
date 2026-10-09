import { fail, type RequestEvent } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './auth';
import { isBlocked, record } from './rate-limit';

/** Page that verification links land on (Better Auth `callbackURL`). */
export const VERIFY_EMAIL_PATH = '/verify-email';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPasswordLength(password: string): boolean {
	return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}

/** Runs a Better Auth call, swallowing its API errors (unknown email, failed send...). */
export async function ignoreApiError(call: () => Promise<unknown>): Promise<void> {
	try {
		await call();
	} catch (err) {
		if (!(err instanceof APIError)) throw err;
	}
}

/** Re-sends the verification link unless `ip` is over the resend limit. */
export async function resendVerification(email: string, ip: string): Promise<void> {
	if (isBlocked('resend', ip)) return;
	record('resend', ip);
	await ignoreApiError(() =>
		auth.api.sendVerificationEmail({ body: { email, callbackURL: VERIFY_EMAIL_PATH } })
	);
}

/**
 * `resend` action for pages that render CheckEmail (it posts the email in a hidden field).
 * Always reports success so it cannot be used to probe which emails exist.
 */
export async function resendAction({ request, getClientAddress }: RequestEvent) {
	const ip = getClientAddress();
	const email = (await request.formData()).get('email');
	if (typeof email !== 'string' || !email) return fail(400, { email: '' });

	await resendVerification(email, ip);
	return { checkEmail: email };
}
