<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The primary band under a `PageHeader tone="primary"` on the four tab screens: it holds the
	 * screen's top controls in `--on-primary` and, with an emerald backdrop above it, is what a
	 * pull-to-refresh uncovers. `overlap` (default): the screen's first card overlaps its bottom
	 * edge; pass false when the screen starts with something other than a card (a list, an empty
	 * state). The content after the band must be positioned (`position: relative`) to paint over it.
	 */
	let { overlap = true, children }: { overlap?: boolean; children?: Snippet } = $props();
</script>

<div class="band" class:overlap>
	{@render children?.()}
</div>

<style>
	.band {
		position: relative;
		margin: 0 calc(var(--gutter) * -1) var(--space-5);
		padding: 0 var(--gutter) var(--space-4);
		background: var(--primary);
		color: var(--on-primary);
	}

	.band.overlap {
		margin-bottom: calc(var(--space-6) * -1);
		padding-bottom: var(--space-8);
	}

	/* Emerald backdrop above the band: what a pull-to-refresh uncovers. Off-screen at rest. */
	.band::before {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		height: 100vh;
		background: var(--primary);
		pointer-events: none;
	}
</style>
