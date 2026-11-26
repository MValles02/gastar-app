import type { RouteId } from '$app/types';

/**
 * Form pages (sticky action bar at the bottom): toasts show at the top instead. Any open drawer does the
 * same (`drawers.open`); detail pages edit inline and have no bar, so they keep toasts at the bottom.
 */
export const FORM_ROUTES: ReadonlySet<string> = new Set<RouteId>([
	'/(app)/movements/new',
	'/(app)/accounts/new',
	'/(app)/categories/new',
	'/(app)/plan/recurring/new',
	'/(app)/plan/limits/new',
	'/(app)/plan/limits/[categoryId]',
	'/(app)/plan/savings',
	'/(app)/plan/rate',
	'/(app)/imports/[id]',
	'/(app)/plan/setup',
	'/(app)/profile/password',
	'/(app)/profile/delete'
]);

/** Routes that show the tab bar and the add-movement FAB. */
export const TAB_ROUTES: ReadonlySet<string> = new Set<RouteId>([
	'/(app)',
	'/(app)/movements',
	'/(app)/plan',
	'/(app)/reports'
]);

/** The delete actions a "Movimiento guardado." Deshacer posts: the movement's and its repeat rule's. */
export const DELETE_ACTION = {
	movement: (id: string) => `/movements/${id}?/delete`,
	recurring: (id: string) => `/plan/recurring/${id}?/delete`
};
