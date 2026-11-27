<script lang="ts">
	import type { Snippet } from 'svelte';
	import SectionLabel from '#lib/components/base/SectionLabel.svelte';

	/**
	 * A summary card: `top` (a month nav or status), an `eyebrow`, the content (an `Amount`) and a
	 * muted `caption` below. Names itself with `ariaLabel`, else with the visible caption.
	 */
	let {
		eyebrow,
		caption,
		ariaLabel,
		align = 'start',
		top,
		children
	}: {
		eyebrow?: string;
		caption?: string;
		/** Names the section; without it the visible `caption` does. */
		ariaLabel?: string;
		align?: 'start' | 'center';
		top?: Snippet;
		children?: Snippet;
	} = $props();

	const captionId = $props.id();
</script>

<section
	class="tile"
	data-align={align}
	aria-label={ariaLabel}
	aria-labelledby={ariaLabel || !caption ? undefined : captionId}
>
	{#if top}{@render top()}{/if}
	{#if eyebrow}<SectionLabel text={eyebrow} as="p" />{/if}
	{#if children}{@render children()}{/if}
	{#if caption}<p id={ariaLabel ? undefined : captionId} class="caption">{caption}</p>{/if}
</section>

<style>
	.tile {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-4);
		background: var(--surface);
		border: 1px solid var(--card-edge);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.tile[data-align='center'] {
		align-items: center;
		text-align: center;
	}

	.tile > :global(.amount[data-size='hero']) {
		align-self: stretch;
		text-align: center;
	}

	.caption {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}
</style>
