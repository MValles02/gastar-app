import { isRedirect, redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';
import { checkEnv } from '$lib/server/env-check';
import { mpOauthEnabled } from '$lib/server/mp-oauth';
import { isReportHour, runMpSyncAll } from '$lib/server/mp-sync';
import { themeColors } from '$lib/theme';
import { THEME_COOKIE } from '$lib/server/cookies';

if (!building && process.env.NODE_ENV === 'production') checkEnv(env);

export const init: ServerInit = () => {
	if (building || !mpOauthEnabled()) return;
	const raw = env.MP_SYNC_INTERVAL_HOURS;
	const hours = raw === undefined || raw === '' ? 1 : Number(raw);
	if (!Number.isInteger(hours) || hours < 0) {
		console.error('mp sync scheduler: invalid MP_SYNC_INTERVAL_HOURS');
		return;
	}
	if (hours === 0) return;
	// No extra lock: the DB lease inside runMpSyncAll keeps overlapping containers (start-first deploys) from
	// syncing at once, and the report-due check keeps them from requesting the daily report twice.
	const run = (report: boolean) =>
		void runMpSyncAll(report).catch(() => console.error('mp sync scheduler: run failed'));
	// Shortly after start: payments, plus the daily report if it was missed while the server was down.
	setTimeout(() => run(true), 60_000).unref();
	// On every full hour (Buenos Aires is a whole-hour offset): payments every `hours`, and the release
	// report (MP emails the owner each time) only at the report hour.
	let tick = 0;
	const next = () => {
		const now = Date.now();
		const wait = Math.ceil((now + 1) / 3_600_000) * 3_600_000 - now + 1_000;
		setTimeout(() => {
			tick++;
			const report = isReportHour(new Date());
			if (report || tick % hours === 0) run(report);
			next();
		}, wait).unref();
	};
	next();
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
