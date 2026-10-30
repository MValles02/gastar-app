<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { sheet } from '$lib/sheet.svelte';

	/**
	 * The layout of a form screen: a bottom sheet with rounded top corners over a dimmed strip. It rises
	 * and lowers with the 'sheet-up' / 'sheet-down' page transitions (app.css) and follows `sheet.offset`
	 * while `SheetHeader` is dragged, springing back when released short of dismissing.
	 */
	let { children }: { children: Snippet } = $props();

	const reset = () => {
		sheet.offset = 0;
		sheet.dragging = false;
		sheet.submitting = false;
	};
	// A navigation between two sheets keeps this element: the next one starts in place.
	afterNavigate(reset);
	$effect(() => reset);
</script>

<div class="backdrop">
	<main
		class="sheet"
		class:dragging={sheet.dragging}
		style:transform={sheet.offset ? `translateY(${sheet.offset}px)` : undefined}
	>
		{@render children()}
	</main>
</div>

<style>
	.backdrop {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		padding-top: calc(env(safe-area-inset-top) + var(--space-3));
		background: linear-gradient(var(--scrim), var(--scrim)) var(--bg);
	}

	.sheet {
		flex: 1;
		width: 100%;
		max-width: var(--content-width);
		margin-inline: auto;
		--gutter: var(--space-5);
		padding: 0 var(--gutter) calc(var(--space-8) + env(safe-area-inset-bottom));
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		background: var(--bg);
		box-shadow: var(--shadow-2);
		/* Clips the bar's safe-area strip while it is not stuck; `clip` keeps sticky working. */
		overflow: clip;
		transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.sheet.dragging {
		transition: none;
	}

	/* Its own layer only while it rises or lowers, so it moves over the screen underneath. */
	:global(:root[data-nav-transition^='sheet']) .sheet {
		view-transition-name: sheet;
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet {
			transition: none;
		}
	}
</style>
