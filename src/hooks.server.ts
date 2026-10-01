import { isRedirect, redirect, type Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';
import { checkEnv } from '$lib/server/env-check';

if (!building && process.env.NODE_ENV === 'production') checkEnv(env);

const PUBLIC_PATHS = ['/login', '/health', '/csp-report'];

function isPublic(pathname: string): boolean {
	return PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api/auth/');
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
	if (event.url.pathname.startsWith('/api/auth/')) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	if (event.locals.user && event.url.pathname === '/login') {
		redirect(303, '/');
	}

	if (!event.locals.user && !isPublic(event.url.pathname)) {
		if (event.request.method === 'GET' || event.request.method === 'HEAD') {
			redirect(303, '/login');
		}
		return new Response('Unauthorized', { status: 401 });
	}

	const theme = event.cookies.get('theme');
	const themeAttr =
		theme === 'light' ? 'data-theme="light"' : theme === 'dark' ? 'data-theme="dark"' : '';

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%theme-attr%', themeAttr)
	});
};
