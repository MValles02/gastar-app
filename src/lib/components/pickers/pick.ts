import { tick } from 'svelte';

/**
 * Commits a picker choice: `set` the value, `close` the drawer, wait for the DOM, let ancestors (e.g.
 * a filter form) see a bubbling `change` from `changeFrom`, then return focus to the trigger.
 * `changeFrom: false` skips the event: DayOfMonthPicker has never dispatched one.
 */
export async function commitPick({
	set,
	close,
	changeFrom,
	trigger
}: {
	set: () => void;
	close: () => void;
	changeFrom: HTMLElement | null | false;
	trigger: HTMLElement | null;
}) {
	set();
	close();
	await tick();
	if (changeFrom) changeFrom.dispatchEvent(new Event('change', { bubbles: true }));
	trigger?.focus();
}
