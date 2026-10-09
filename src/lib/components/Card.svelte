<script lang="ts">
	import type { Snippet } from 'svelte';

	/** `flush` drops the padding and clips children, for cards that lay out their own sections. */
	let {
		maxWidth,
		flush = false,
		children
	}: { maxWidth?: string; flush?: boolean; children: Snippet } = $props();
</script>

<div class="card" class:flush style:max-width={maxWidth}>
	{@render children()}
</div>

<style>
	.card {
		width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
		padding: var(--space-4);
	}

	.card.flush {
		padding: 0;
		overflow: hidden;
	}
</style>
