import { onMount } from 'svelte';

/** `current` turns true once the component has hydrated; until then it renders its no-JS markup. */
export function hydrated() {
	let mounted = $state(false);
	onMount(() => (mounted = true));
	return {
		get current() {
			return mounted;
		}
	};
}
