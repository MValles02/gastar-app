import { error, redirect } from '@sveltejs/kit';
import { isUuid } from './db/util';
import { requestEvent } from './request-memo';

/**
 * The signed-in user for a route under (app). hooks.server.ts already rejects signed-out requests there,
 * so the fallback is unreachable; it mirrors that guard (GET/HEAD → /login, anything else → 401).
 */
export function requireUser(locals: App.Locals): NonNullable<App.Locals['user']> {
	if (locals.user) return locals.user;
	const { method } = requestEvent().request;
	if (method === 'GET' || method === 'HEAD') redirect(303, '/login');
	error(401, 'Unauthorized');
}

/** A detail route's 404: `notFound()` throws it; `requireId(id)` throws it for a malformed id, before any query. */
export type Guards = ReturnType<typeof notFoundHelpers>;

export function notFoundHelpers(message: string) {
	const notFound = (): never => error(404, message);
	const requireId = (id: string) => {
		if (!isUuid(id)) notFound();
	};
	return { notFound, requireId };
}
