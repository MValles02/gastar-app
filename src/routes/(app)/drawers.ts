import type { Component } from 'svelte';
import type { DrawerRouteKey } from '#lib/drawer-routes.ts';

// Routes that open as a drawer over a screen (shallow routing, `openShallow`): key -> the route's
// screen, rendered by the (app) layout with `data` (the route's preloaded load) and `onclose`. They
// have no full page: a direct load of the URL opens over the parent screen (`#lib/drawer-routes.ts`).
// Adding one is a route folder (its +page.svelte is `<DrawerRoute />`), a line here and one there. `App.PageState` derives from this.
export const drawers = {
	newMovement: () => import('./movements/new/NewMovementScreen.svelte'),
	movement: () => import('./movements/[id]/MovementScreen.svelte'),
	rule: () => import('./plan/recurring/[id]/RuleScreen.svelte'),
	newRule: () => import('./plan/recurring/new/NewRuleScreen.svelte'),
	limit: () => import('./plan/limits/[categoryId]/LimitScreen.svelte'),
	newLimit: () => import('./plan/limits/new/NewLimitScreen.svelte'),
	rate: () => import('./plan/rate/RateScreen.svelte'),
	savings: () => import('./plan/savings/SavingsScreen.svelte'),
	account: () => import('./accounts/[id]/AccountScreen.svelte'),
	newAccount: () => import('./accounts/new/NewAccountScreen.svelte'),
	category: () => import('./categories/[id]/CategoryScreen.svelte'),
	newCategory: () => import('./categories/new/NewCategoryScreen.svelte'),
	password: () => import('./profile/password/PasswordScreen.svelte'),
	deleteAccount: () => import('./profile/delete/DeleteAccountScreen.svelte'),
	importItem: () => import('./imports/[id]/ImportItemScreen.svelte')
} satisfies Record<DrawerRouteKey, () => Promise<{ default: Component<any> }>>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type DrawerKey = keyof typeof drawers;

/** The preloaded route data a drawer is opened with (nothing when it takes none). */
export type DrawerStates = {
	[K in DrawerKey]?: Awaited<ReturnType<(typeof drawers)[K]>>['default'] extends Component<infer P>
		? P extends { data: infer D }
			? D
			: object
		: never;
};
