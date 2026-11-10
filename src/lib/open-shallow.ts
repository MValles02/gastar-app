import { goto, preloadData, pushState, replaceState } from '$app/navigation';
import { page } from '$app/state';

/** A click the browser should handle itself (new tab, new window, non-primary button). */
export const isModifiedClick = (e: MouseEvent) =>
	e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/**
 * Opens a route that also works as a drawer over the current screen as `page.state[key]` (shallow
 * route, URL unchanged). From a click handler an unmodified click opens it and anything else, or a
 * failed load, is a normal navigation; pass `null` to open it without a click. `replace` refreshes the
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
		if (!replace) pushState('', { [key]: result.data } as App.PageState);
		else if (page.state[key]) replaceState('', { [key]: result.data } as App.PageState);
	}
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved href
	else await goto(href);
}
