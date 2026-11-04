import { goto, preloadData, pushState } from '$app/navigation';

/**
 * Click handler for a link to a route that also works as a drawer: an unmodified click preloads `href`
 * and opens it over the current screen as `page.state[key]` (shallow route, URL unchanged); anything
 * else, or a failed load, is a normal navigation.
 */
export async function openShallow(e: MouseEvent, href: string, key: keyof App.PageState) {
	if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
		return;
	e.preventDefault();
	const result = await preloadData(href);
	if (result.type === 'loaded' && result.status === 200)
		pushState('', { [key]: result.data } as App.PageState);
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved href
	else await goto(href);
}
