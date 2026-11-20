import { createHash, randomBytes } from 'node:crypto';
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/env';
import { tooManyAttempts } from '../auth-forms';
import { requireUser } from '../guards';
import { isBlocked, record } from '../rate-limit';

/**
 * One OAuth account link (Gmail, Mercado Pago) as data: the profile page at `path` starts it, the provider
 * answers at `${path}/callback`, and the PKCE verifier and CSRF state wait in the `cookie` meanwhile.
 * `flashes` are the provider's own `?error=` messages (at least 'exchange'); the shared ones are below.
 */
export type OAuthLink<Code extends string = string> = {
	path: string;
	cookie: string;
	enabled: () => boolean;
	flashes: Record<Code | 'exchange', string>;
	/** Rate-limits starting the link (and its callback) per user. */
	limitStart: boolean;
	start: (
		origin: string,
		user: { id: string; email: string }
	) => Promise<{ state: string; verifier: string; url: string }>;
	/** Exchanges the authorization code and stores the connection; anything but 'ok' is a flash code. */
	exchange: (
		userId: string,
		code: string,
		verifier: string,
		origin: string
	) => Promise<'ok' | Code | 'exchange'>;
	unlink: (userId: string) => Promise<void>;
};

const SHARED_FLASHES = {
	denied: 'Cancelaste la vinculación.',
	state: 'La vinculación venció. Probá de nuevo.'
};

const b64url = (buf: Buffer) => buf.toString('base64url');

/** New CSRF state and PKCE verifier, with the verifier's S256 challenge. */
export function pkce() {
	const verifier = b64url(randomBytes(32));
	return {
		state: b64url(randomBytes(32)),
		verifier,
		challenge: b64url(createHash('sha256').update(verifier).digest())
	};
}

export const callbackUrl = (path: string, origin: string) => `${origin}${path}/callback`;

/** The link page's notices from its URL: `?linked=1` and the message of a known `?error=` code. */
export function linkFlash(link: OAuthLink, url: URL) {
	const flashes: Record<string, string> = {
		...SHARED_FLASHES,
		...(link.limitStart ? { rate: tooManyAttempts('minuto') } : {}),
		...link.flashes
	};
	const code = url.searchParams.get('error');
	return {
		linked: url.searchParams.get('linked') === '1',
		flash: code && code in flashes ? flashes[code] : null
	};
}

/** The `connect` form action: stores the PKCE cookie and redirects to the provider's consent page. */
export function connectAction(link: OAuthLink) {
	return async ({ locals, cookies, url }: RequestEvent) => {
		if (!link.enabled()) error(404);
		const user = requireUser(locals);
		if (link.limitStart) {
			if (isBlocked('oauthStart', user.id)) redirect(303, `${link.path}?error=rate`);
			record('oauthStart', user.id);
		}
		const { state, verifier, url: authorizeUrl } = await link.start(url.origin, user);
		cookies.set(link.cookie, JSON.stringify({ userId: user.id, state, verifier }), {
			path: link.path,
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 600
		});
		// The provider's OAuth page: the only external redirect, allowed by origin.
		redirect(303, authorizeUrl, { external: [new URL(authorizeUrl).origin] });
	};
}

export function disconnectAction(link: OAuthLink) {
	return async ({ locals }: RequestEvent) => {
		if (!link.enabled()) error(404);
		await link.unlink(requireUser(locals).id);
		redirect(303, link.path);
	};
}

/** GET handler of `${path}/callback`: checks the state cookie, exchanges the code and goes back to the page. */
export function callbackHandler(link: OAuthLink) {
	return async ({ url, cookies, locals }: RequestEvent) => {
		if (!link.enabled()) error(404);
		const raw = cookies.get(link.cookie);
		cookies.delete(link.cookie, { path: link.path, secure: !dev });
		function back(query: string): never {
			redirect(303, `${link.path}?${query}`);
		}
		const userId = requireUser(locals).id;
		if (link.limitStart && isBlocked('oauthStart', userId)) back('error=rate');

		let saved: { userId?: unknown; state?: unknown; verifier?: unknown } = {};
		try {
			saved = JSON.parse(raw ?? '');
		} catch {
			// Missing or malformed cookie: handled below as a state error.
		}
		const state = url.searchParams.get('state');
		if (
			typeof saved.state !== 'string' ||
			typeof saved.verifier !== 'string' ||
			!state ||
			state !== saved.state ||
			saved.userId !== userId
		) {
			back('error=state');
		}
		if (url.searchParams.get('error')) back('error=denied');
		const code = url.searchParams.get('code');
		let result: string = 'exchange';
		if (code) {
			try {
				result = await link.exchange(userId, code, saved.verifier as string, url.origin);
			} catch {
				// Nothing from the error is logged or put in the URL: it may carry token material.
			}
		}
		back(result === 'ok' ? 'linked=1' : `error=${result}`);
	};
}
