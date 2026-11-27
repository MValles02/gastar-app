import { resolve } from '$app/paths';
import type { RouteId } from '$app/types';

/** Query param a direct load of a drawer URL is redirected with: the drawer path + search. */
export const DRAWER_PARAM = 'drawer';

/**
 * Every drawer route and the screen it opens over. A drawer has no full page: a direct load of its URL
 * redirects to `parent?drawer=<url>`, and the (app) layout opens it there.
 */
export const DRAWER_ROUTES = {
	newMovement: { route: '/(app)/movements/new', parent: '/(app)' },
	movement: { route: '/(app)/movements/[id]', parent: '/(app)/movements' },
	rule: { route: '/(app)/plan/recurring/[id]', parent: '/(app)/plan' },
	newRule: { route: '/(app)/plan/recurring/new', parent: '/(app)/plan' },
	limit: { route: '/(app)/plan/limits/[categoryId]', parent: '/(app)/plan' },
	newLimit: { route: '/(app)/plan/limits/new', parent: '/(app)/plan' },
	rate: { route: '/(app)/plan/rate', parent: '/(app)/plan' },
	savings: { route: '/(app)/plan/savings', parent: '/(app)/plan' },
	account: { route: '/(app)/accounts/[id]', parent: '/(app)/accounts' },
	newAccount: { route: '/(app)/accounts/new', parent: '/(app)/accounts' },
	category: { route: '/(app)/categories/[id]', parent: '/(app)/categories' },
	newCategory: { route: '/(app)/categories/new', parent: '/(app)/categories' },
	password: { route: '/(app)/profile/password', parent: '/(app)/profile' },
	deleteAccount: { route: '/(app)/profile/delete', parent: '/(app)/profile' },
	importItem: { route: '/(app)/imports/[id]', parent: '/(app)/imports' }
} as const satisfies Record<string, { route: RouteId; parent: RouteId }>;

export type DrawerRouteKey = keyof typeof DRAWER_ROUTES;

const KEYS = Object.keys(DRAWER_ROUTES) as DrawerRouteKey[];

export function drawerOf(routeId: string | null): DrawerRouteKey | null {
	return KEYS.find((k) => DRAWER_ROUTES[k].route === routeId) ?? null;
}

/** The parent screen URL that opens drawer `key` for `url` (a drawer route URL, the `?/action` part dropped). */
export function drawerHref(key: DrawerRouteKey, url: Pick<URL, 'pathname' | 'search'>): string {
	const params = new URLSearchParams(url.search);
	for (const name of [...params.keys()]) if (name.startsWith('/')) params.delete(name);
	const search = params.toString();
	const target = url.pathname + (search ? `?${search}` : '');
	return `${resolve(DRAWER_ROUTES[key].parent)}?${DRAWER_PARAM}=${encodeURIComponent(target)}`;
}
