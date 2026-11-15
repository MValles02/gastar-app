import { fail, type RequestEvent } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_NAME_MAX_LENGTH } from '#lib/fields.ts';
import { auth } from './auth';
import { isBlocked, record } from './rate-limit';

/** Page that verification links land on (Better Auth `callbackURL`). */
export const VERIFY_EMAIL_PATH = '/verify-email';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Error for an invalid (already trimmed) person name, or undefined when valid. */
export function userNameError(name: string): string | undefined {
	if (!name) return 'Falta el nombre.';
	if (name.length > USER_NAME_MAX_LENGTH)
		return `Usá un nombre de hasta ${USER_NAME_MAX_LENGTH} caracteres.`;
}

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
