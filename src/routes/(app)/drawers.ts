import type { Component } from 'svelte';

// Routes that also open as a drawer over the current screen (shallow routing, `openShallow`): key ->
// the drawer component, rendered by the (app) layout with `data` (the route's preloaded load) and
// `onclose`. Adding one is a route folder plus a line here. `App.PageState` derives from this.
export const drawers = {
	newMovement: () => import('./movements/new/NewMovementDrawer.svelte'),
	movement: () => import('./movements/[id]/MovementDetailDrawer.svelte'),
	newRule: () => import('./plan/recurring/new/NewRuleDrawer.svelte'),
	limit: () => import('./plan/limits/[categoryId]/LimitDetail.svelte'),
	newLimit: () => import('./plan/limits/new/NewLimitDrawer.svelte'),
	rate: () => import('./plan/rate/RateDrawer.svelte'),
	savings: () => import('./plan/savings/SavingsDrawer.svelte'),
	newAccount: () => import('./accounts/new/NewAccountDrawer.svelte'),
	newCategory: () => import('#lib/components/categories/CategoryCreateDrawer.svelte'),
	password: () => import('./profile/password/PasswordDrawer.svelte'),
	deleteAccount: () => import('./profile/delete/DeleteAccountDrawer.svelte'),
	importItem: () => import('./imports/[id]/ImportItemDrawer.svelte')
} satisfies Record<string, () => Promise<{ default: Component<any> }>>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type DrawerKey = keyof typeof drawers;

/** The preloaded route data a drawer is opened with (nothing when it takes none). */
export type DrawerStates = {
	[K in DrawerKey]?: Awaited<ReturnType<(typeof drawers)[K]>>['default'] extends Component<infer P>
		? P extends { data: infer D }
			? D
			: object
		: never;
};
