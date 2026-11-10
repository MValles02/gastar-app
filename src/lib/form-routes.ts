import type { RouteId } from '$app/types';

/** Form routes (sticky action bar at the bottom): toasts show at the top instead. */
export const FORM_ROUTES: ReadonlySet<string> = new Set<RouteId>([
	'/(app)/movements/new',
	'/(app)/accounts/new',
	'/(app)/categories/new',
	'/(app)/plan/recurring/new',
	'/(app)/plan/limits/new',
	'/(app)/plan/limits/[categoryId]',
	'/(app)/plan/savings',
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
