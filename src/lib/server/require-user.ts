import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';

/**
 * The signed-in user for a route under (app). hooks.server.ts already rejects signed-out requests there,
 * so the fallback is unreachable; it mirrors that guard (GET/HEAD → /login, anything else → 401).
 */
export function requireUser(locals: App.Locals): NonNullable<App.Locals['user']> {
	if (locals.user) return locals.user;
	const { method } = getRequestEvent().request;
	if (method === 'GET' || method === 'HEAD') redirect(303, '/login');
	error(401, 'Unauthorized');
}
