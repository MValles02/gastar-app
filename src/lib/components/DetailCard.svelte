<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * One card of stacked `<li>` rows (detail screens and forms). A row with the `bad` class gets a
	 * left `--negative` bar, or a full `--negative` outline with `outlineErrors` (the drawers).
	 */
	let { children, outlineErrors = false }: { children: Snippet; outlineErrors?: boolean } =
		$props();
</script>

<ul class="card" class:outline-errors={outlineErrors}>{@render children()}</ul>

<style>
	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--card-edge);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.card > :global(li.bad) {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.card.outline-errors > :global(li.bad) {
		box-shadow: inset 0 0 0 1.5px var(--negative);
	}
</style>
