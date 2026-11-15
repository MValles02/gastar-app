<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Currency } from '#lib/money.ts';
	import * as Card from '#lib/components/ui/card/index.js';
	import HeroAmount from './HeroAmount.svelte';

	/**
	 * Amount card of a detail page: centered amount with a muted label below, no icon.
	 * `top` holds a month nav; `children` replaces the amount (empty or multi-currency states).
	 */
	let {
		cents,
		currency,
		tone = 'stock',
		direction,
		label,
		labelId,
		ariaLabel,
		top,
		children
	}: {
		cents?: number;
		currency?: Currency;
		tone?: 'stock' | 'flow';
		direction?: 'income' | 'outcome' | 'transfer';
		label?: string;
		/** Id for the label; the section is then named by it. */
		labelId?: string;
		ariaLabel?: string;
		top?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<section aria-label={labelId ? undefined : ariaLabel} aria-labelledby={labelId}>
	<Card.Root>
		<Card.Content>
			<div class="detail-hero">
				{#if top}{@render top()}{/if}
				{#if children}
					{@render children()}
				{:else if cents !== undefined && currency}
					<HeroAmount {cents} {currency} {tone} {direction} />
				{/if}
				{#if label}<p id={labelId} class="label">{label}</p>{/if}
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

	.detail-hero > :global(.hero-amount) {
		align-self: stretch;
		text-align: center;
	}

	.label {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}
</style>
