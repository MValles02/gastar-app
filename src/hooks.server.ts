import { redirect, type Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';

const PUBLIC_PATHS = ['/login', '/health'];

function isPublic(pathname: string): boolean {
	return PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api/auth/');
}

export const handle: Handle = async ({ event, resolve }) => {
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
