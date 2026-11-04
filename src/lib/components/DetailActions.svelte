<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * Detail-page actions: primary (full width), then Editar + secondary side by side (Editar alone is
	 * full width), then the destructive action (full width). `editHref` is already resolved.
	 */
	let {
		primary,
		editHref,
		secondary,
		destructive
	}: { primary?: Snippet; editHref?: string; secondary?: Snippet; destructive?: Snippet } =
		$props();
</script>

<div class="actions">
	{#if primary}{@render primary()}{/if}
	<div class="pair">
		{#if editHref}<Button href={editHref} variant="outline" class="w-full">Editar</Button>{/if}
		{#if secondary}{@render secondary()}{/if}
	</div>
	{#if destructive}{@render destructive()}{/if}
</div>

<style>
	.actions {
		display: grid;
		gap: var(--space-3);
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.pair > :global(:only-child) {
		grid-column: 1 / -1;
	}

	.pair > :global(*),
	.actions > :global(*) {
		min-width: 0;
	}
</style>
