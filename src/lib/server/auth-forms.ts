import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_NAME_MAX_LENGTH } from '#lib/fields.ts';
import { auth } from './auth';
import { isBlocked, record } from './rate-limit';
import { GOOGLE_PROVIDER_ID } from './reauth';

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

/** Better Auth error codes the forms branch on. */
export const INVALID_PASSWORD = 'INVALID_PASSWORD';
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

/** Whether `err` is a Better Auth API error, optionally with the given `code`. */
export function isApiError(err: unknown, code?: string): err is APIError {
	return err instanceof APIError && (code === undefined || err.body?.code === code);
}

/** Rate-limit message for form actions. */
export function tooManyAttempts(when: 'minuto' | 'rato'): string {
	return `Demasiados intentos. Probá de nuevo en un ${when}.`;
}

/** Runs a Better Auth call, swallowing its API errors (unknown email, failed send...). */
export async function ignoreApiError(call: () => Promise<unknown>): Promise<void> {
	try {
		await call();
	} catch (err) {
		if (!isApiError(err)) throw err;
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

type GoogleStart = {
	/** Where the browser goes when rate limited. */
	blocked: string;
	/** Where it goes when Google gives no URL. */
	unavailable: string;
	callbackURL: string;
	newUserCallbackURL: string;
	errorCallbackURL: string;
	/** Force a fresh Google login (re-authentication). */
	reauth?: boolean;
};

/**
 * Sends the browser to Google. Better Auth's state and PKCE cookies ride along on the 303
 * (sveltekitCookies); the callback lands on the given URLs.
 */
async function startGoogle(
	{ request, getClientAddress }: RequestEvent,
	{ blocked, unavailable, reauth, ...urls }: GoogleStart
) {
	const ip = getClientAddress();
	if (isBlocked('oauthStart', ip)) redirect(303, blocked);
	record('oauthStart', ip);

	let url: string | undefined;
	try {
		({ url } = await auth.api.signInSocial({
			body: { provider: GOOGLE_PROVIDER_ID, ...urls, disableRedirect: true },
			headers: request.headers
		}));
	} catch (err) {
		if (!isApiError(err)) throw err;
	}
	if (!url) redirect(303, unavailable);
	if (reauth) {
		// select_account forces the account picker (Google rejects prompt=login) and max_age=0 asks for a
		// fresh login; the server-side recent-session check is what actually guards.
		const next = new URL(url);
		next.searchParams.set('prompt', 'select_account');
		next.searchParams.set('max_age', '0');
		url = next.toString();
	}
	// Google's authorization page: the only external redirect, allowed by origin.
	redirect(303, url, { external: [new URL(url).origin] });
}

/** `google` action of /login and /signup: the callback lands on / or /login?error=<code>. */
export const googleAction = (event: RequestEvent) =>
	startGoogle(event, {
		blocked: '/login?error=rate_limited',
		unavailable: '/login?error=unavailable',
		callbackURL: '/',
		newUserCallbackURL: '/',
		errorCallbackURL: '/login'
	});

/**
 * `google` action of the password-less pages: a fresh Google sign-in that lands back on `returnTo`
 * (a Google account with no user here goes to / and never to a delete page).
 */
export const googleReauthAction = (returnTo: '/profile/delete' | '/profile/password') => {
	return (event: RequestEvent) =>
		startGoogle(event, {
			blocked: returnTo,
			unavailable: returnTo,
			callbackURL: returnTo,
			newUserCallbackURL: '/',
			errorCallbackURL: returnTo,
			reauth: true
		});
};

/**
 * `resend` action for pages that render CheckEmail (it posts the email in a hidden field).
 * Always reports success so it cannot be used to probe which emails exist.
 */
export async function resendAction({ request, getClientAddress }: RequestEvent) {
	const ip = getClientAddress();
	const email = (await request.formData()).get('email');
	if (typeof email !== 'string' || !EMAIL_RE.test(email)) return fail(400, { email: '' });

	await resendVerification(email, ip);
	return { checkEmail: email };
}
