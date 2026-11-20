import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { EMAIL_RE, INVALID_EMAIL_MESSAGE } from '#lib/fields.ts';
import { auth } from './auth';
import { str } from './forms';
import { rateLimited } from './rate-limit';
import { GOOGLE_PROVIDER_ID } from './reauth';

/** Page that verification links land on (Better Auth `callbackURL`). */
export const VERIFY_EMAIL_PATH = '/verify-email';

/** The posted email, trimmed, with the message to show when it is not one. */
export function readEmail(fd: FormData): { email: string; emailError?: string } {
	const email = str(fd, 'email').trim();
	return EMAIL_RE.test(email) ? { email } : { email, emailError: INVALID_EMAIL_MESSAGE };
}

export const INVALID_PASSWORD = 'INVALID_PASSWORD';
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

export function isApiError(err: unknown, code?: string): err is APIError {
	return err instanceof APIError && (code === undefined || err.body?.code === code);
}

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
	if (rateLimited('oauthStart', ip)) redirect(303, blocked);

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
	const { email, emailError } = readEmail(await request.formData());
	if (emailError) return fail(400, { email, emailError });

	if (!rateLimited('resend', ip)) {
		await ignoreApiError(() =>
			auth.api.sendVerificationEmail({ body: { email, callbackURL: VERIFY_EMAIL_PATH } })
		);
	}
	return { checkEmail: email };
}
