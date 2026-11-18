import { isRedirect, redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { checkEnv } from '#lib/server/env-check.ts';
import { startImportSchedulers } from '#lib/server/imports/automatic.ts';
import { themeColors } from '#lib/theme.ts';
import { THEME_COOKIE } from '#lib/server/cookies.ts';

if (!building && process.env.NODE_ENV === 'production') checkEnv(process.env);

export const init: ServerInit = () => {
	if (!building) startImportSchedulers();
};

const AUTH_API_PREFIX = '/api/auth/';

const SIGNED_OUT_ONLY_PATHS = ['/login', '/signup', '/forgot-password'];

const PUBLIC_PATHS = [
	...SIGNED_OUT_ONLY_PATHS,
	'/reset-password',
	'/verify-email',
	'/health',
	'/csp-report',
	'/dev/outbox'
];

function isPublic(pathname: string): boolean {
	return PUBLIC_PATHS.includes(pathname) || pathname.startsWith(AUTH_API_PREFIX);
}

const SECURITY_HEADERS = {
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'X-Content-Type-Options': 'nosniff'
};

export const handle: Handle = async ({ event, resolve }) => {
	let response: Response;
	try {
		response = await handleRequest({ event, resolve });
	} catch (err) {
		// redirect() throws from the hook; turn it into a response so it gets the headers too
		if (!isRedirect(err)) throw err;
		response = new Response(null, { status: err.status, headers: { location: err.location } });
	}
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}
	return response;
};

const handleRequest: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith(AUTH_API_PREFIX)) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	// /health never reads the session, so the container healthcheck skips the lookup. Other public routes
	// keep it: browsers send the session cookie there and getSession may refresh or clear it.
	const session =
		event.url.pathname === '/health'
			? null
			: await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	if (event.locals.user && SIGNED_OUT_ONLY_PATHS.includes(event.url.pathname)) {
		redirect(303, '/');
	}

	if (!event.locals.user && !isPublic(event.url.pathname)) {
		if (event.request.method === 'GET' || event.request.method === 'HEAD') {
			redirect(303, '/login');
		}
		return new Response('Unauthorized', { status: 401 });
	}

	const theme = event.cookies.get(THEME_COOKIE);
	const themeAttr = theme === 'light' || theme === 'dark' ? `data-theme="${theme}"` : '';

	const colors = themeColors(theme);

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html
				.replace('%theme-attr%', themeAttr)
				.replace('%theme-color-light%', colors.light)
				.replace('%theme-color-dark%', colors.dark)
	});
};
