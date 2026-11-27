<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Currency } from '#lib/money.ts';
	import * as Card from '#lib/components/ui/card/index.js';
	import Amount from '#lib/components/base/Amount.svelte';

	/**
	 * Amount card of a detail page: centered amount with a muted label below, no icon.
	 * `top` holds a month nav; `children` replaces the amount (empty or multi-currency states).
	 */
	let {
		cents,
		currency,
		label,
		ariaLabel,
		top,
		children
	}: {
		cents?: number;
		currency?: Currency;
		label?: string;
		/** Names the section; without it the visible `label` does. */
		ariaLabel?: string;
		top?: Snippet;
		children?: Snippet;
	} = $props();

	const labelId = $props.id();
</script>

<section aria-label={ariaLabel} aria-labelledby={ariaLabel || !label ? undefined : labelId}>
	<Card.Root>
		<Card.Content>
			<div class="detail-hero">
				{#if top}{@render top()}{/if}
				{#if children}
					{@render children()}
				{:else if cents !== undefined && currency}
					<Amount size="hero" as="p" {cents} {currency} />
				{/if}
				{#if label}<p id={ariaLabel ? undefined : labelId} class="label">{label}</p>{/if}
			</div>
		</Card.Content>
	</Card.Root>
</section>

<style>
	.detail-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-3) 0;
		text-align: center;
	}

	.detail-hero > :global(.amount[data-size='hero']) {
		align-self: stretch;
		text-align: center;
	}

	.label {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}
</style>
