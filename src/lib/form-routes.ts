/** Routes that hide the tab bar (forms and the plan setup flow). */
export const FORM_ROUTES = new Set([
	'/(app)/movements/new',
	'/(app)/movements/[id]/edit',
	'/(app)/accounts/new',
	'/(app)/accounts/[id]/edit',
	'/(app)/categories/new',
	'/(app)/categories/[id]/edit',
	'/(app)/plan/recurring/new',
	'/(app)/plan/setup',
	'/(app)/profile/name',
	'/(app)/profile/password',
	'/(app)/profile/delete'
]);

/** Routes that show the tab bar and the add-movement FAB. */
export const TAB_ROUTES = new Set(['/(app)', '/(app)/movements', '/(app)/plan', '/(app)/reports']);
