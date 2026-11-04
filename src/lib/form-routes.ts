/** Form routes (sticky action bar at the bottom): toasts show at the top instead. */
export const FORM_ROUTES = new Set([
	'/(app)/movements/new',
	'/(app)/accounts/new',
	'/(app)/accounts/[id]/edit',
	'/(app)/categories/new',
	'/(app)/categories/[id]/edit',
	'/(app)/plan/recurring/new',
	'/(app)/plan/limits/new',
	'/(app)/plan/limits/[categoryId]',
	'/(app)/plan/savings',
	'/(app)/plan/setup',
	'/(app)/profile/name',
	'/(app)/profile/password',
	'/(app)/profile/delete'
]);

/** Routes that show the tab bar and the add-movement FAB. */
export const TAB_ROUTES = new Set(['/(app)', '/(app)/movements', '/(app)/plan', '/(app)/reports']);
