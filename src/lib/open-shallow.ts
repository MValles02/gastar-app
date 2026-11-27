import { goto, preloadData, replaceState } from '$app/navigation';
import { page } from '$app/state';
import { toast } from 'svelte-sonner';
import { es } from '#lib/copy/es.ts';

/** A click the browser should handle itself (new tab, new window, non-primary button). */
export const isModifiedClick = (e: MouseEvent) =>
	e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/**
 * Opens a route that also works as a drawer over the current screen as `page.state[key]` (shallow
 * route, URL unchanged). From a click handler an unmodified click opens it and anything else is left
 * to the browser; a redirect result follows its location and a failed load shows an error toast
 * (`es.ui.openFailed`). Pass `null` to open it without a click. `replace` refreshes the
 * drawer already open under `key` with a fresh load instead of stacking another one.
 */
export async function openShallow(
	e: MouseEvent | null,
	href: string,
	key: keyof App.PageState,
	{ replace = false } = {}
) {
	if (e) {
		if (isModifiedClick(e)) return;
		e.preventDefault();
	}
	const result = await preloadData(href);
	if (result.type === 'loaded' && result.status === 200) {
		const state = { [key]: result.data } as App.PageState;
		// Shallow: the URL stays the one in the address bar.
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- shallow goto keeps the current URL
		if (!replace) goto('', { shallow: true, state });
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- shallow goto keeps the current URL
		else if (page.state[key]) goto('', { shallow: true, replace: true, state });
	}
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- the server-validated redirect location
	else if (result.type === 'redirect') await goto(result.location);
	else toast.error(es.ui.openFailed);
}

/**
 * Merges `patch` into the data of the drawer open under `key` (no-op when none is): a drawer's
 * preloaded data is not reloaded by `refreshAll`, so an in-place save writes its answer here to keep
 * the drawer showing it.
 */
export function patchShallow<K extends keyof App.PageState>(
	key: K,
	patch: Partial<NonNullable<App.PageState[K]>>
) {
	const current = page.state[key];
	if (current) replaceState('', { ...page.state, [key]: { ...current, ...patch } });
}
