import { error, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { isDevOrE2E } from '#lib/e2e.ts';
import { auth } from '#lib/server/auth.ts';
import { checkEnv } from '#lib/server/env-check.ts';
import { rejectSignedOut } from '#lib/server/guards.ts';
import { startImportSchedulers } from '#lib/server/imports/automatic.ts';
import { drawerHref, drawerOf } from '#lib/drawer-routes.ts';
import { themeColors } from '#lib/theme.ts';
import { THEME_COOKIE } from '#lib/server/cookies.ts';

if (!building && process.env.NODE_ENV === 'production') checkEnv(process.env);

export const init: ServerInit = () => {
	if (!building) startImportSchedulers();
};

const AUTH_API_PREFIX = '/api/auth/';
const DEV_PREFIX = '/dev/';

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
		// redirect() and error() throw from the hook; turn them into responses so they get the headers too
		if (isRedirect(err)) {
			response = new Response(null, { status: err.status, headers: { location: err.location } });
		} else if (isHttpError(err)) {
			response = new Response(err.body.message, { status: err.status });
		} else throw err;
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

	if (event.url.pathname.startsWith(DEV_PREFIX) && !isDevOrE2E) error(404, 'Not found');

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
		rejectSignedOut(event.request.method);
	}

	const theme = event.cookies.get(THEME_COOKIE);
	const themeAttr = theme === 'light' || theme === 'dark' ? `data-theme="${theme}"` : '';

	const colors = themeColors(theme);

	const response = await resolve(event, {
		// Every screen is set in Geist Mono: preload its Latin face so first paint does not reflow
		// on the font swap (it wrapped /plan's rate line and shifted the page, CLS 0.16).
		preload: ({ type, path }) =>
			type === 'js' || type === 'css' || (type === 'font' && path.includes('latin-wght-normal')),
		transformPageChunk: ({ html }) =>
			html
				.replace('%theme-attr%', themeAttr)
				.replace('%theme-color-light%', colors.light)
				.replace('%theme-color-dark%', colors.dark)
	});

	// Drawers have no full page: a direct load of one (HTML 200) goes to its parent screen with it open.
	// The load already ran, so a bad id kept its 404 or redirect. Actions and data requests pass through.
	const key = drawerOf(event.route.id);
	if (
		key &&
		!event.isDataRequest &&
		response.status === 200 &&
		response.headers.get('content-type')?.startsWith('text/html')
	) {
		const redirected = new Response(null, {
			status: 303,
			headers: { location: drawerHref(key, event.url) }
		});
		for (const cookie of response.headers.getSetCookie())
			redirected.headers.append('set-cookie', cookie);
		return redirected;
	}
	return response;
};
