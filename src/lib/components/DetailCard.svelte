<script lang="ts">
	import type { Snippet } from 'svelte';

	/** The card of editable rows on a detail page (`DetailRow`s, or `<li>`s with their own picker). */
	let { children }: { children: Snippet } = $props();
</script>

<ul class="card">{@render children()}</ul>

<style>
	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}
</style>
