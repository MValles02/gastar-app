<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		as = 'p',
		id,
		class: className = '',
		children
	}: {
		as?: 'p' | 'h2' | 'dt' | 'span';
		id?: string;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<svelte:element this={as} {id} class="eyebrow {className}">{@render children()}</svelte:element>

<style>
	.eyebrow {
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
</style>
