import { isRedirect, redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';
import { checkEnv } from '$lib/server/env-check';
import { mpOauthEnabled } from '$lib/server/mp-oauth';
import { runMpSyncAll } from '$lib/server/mp-sync';
import { themeColors } from '$lib/theme';
import { THEME_COOKIE } from '$lib/server/cookies';

if (!building && process.env.NODE_ENV === 'production') checkEnv(env);

export const init: ServerInit = () => {
	if (building || !mpOauthEnabled()) return;
	const raw = env.MP_SYNC_INTERVAL_HOURS;
	const hours = raw === undefined || raw === '' ? 6 : Number(raw);
	if (!Number.isFinite(hours) || hours < 0) {
		console.error('mp sync scheduler: invalid MP_SYNC_INTERVAL_HOURS');
		return;
	}
	if (hours === 0) return;
	// No extra lock: the DB lease inside runMpSyncAll keeps overlapping containers (start-first deploys) from syncing at once.
	const run = () => void runMpSyncAll().catch(() => console.error('mp sync scheduler: run failed'));
	setTimeout(run, 60_000).unref();
	// Node fires delays above 2^31-1 ms (~24 days) after 1 ms, so cap there.
	setInterval(run, Math.min(hours * 3_600_000, 2 ** 31 - 1)).unref();
};

const AUTH_API_PREFIX = '/api/auth/';

/** Pages a signed-in user has no use for; they are sent home instead. */
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

	const session = await auth.api.getSession({ headers: event.request.headers });
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
