import { goto, preloadData, pushState } from '$app/navigation';
import { resolve } from '$app/paths';

/**
 * Click handler for a link to /movements/new: an unmodified click opens the "Nuevo movimiento" drawer
 * over the current screen (shallow route, URL unchanged); anything else is a normal link.
 */
export async function openNewMovement(e: MouseEvent) {
	if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
		return;
	e.preventDefault();
	const href = resolve('/movements/new');
	const result = await preloadData(href);
	if (result.type === 'loaded' && result.status === 200)
		pushState('', { newMovement: result.data as App.PageState['newMovement'] });
	else await goto(href);
}
