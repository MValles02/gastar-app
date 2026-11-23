<script lang="ts">
	import { formatMoney, type Currency } from '#lib/money.ts';
	import Money from './Money.svelte';

	/** The big display amount of Inicio, Plan and Reportes; shrinks only when the amount would overflow its box. */
	let {
		cents,
		currency,
		tone = 'stock',
		direction,
		as = 'p',
		class: className = ''
	}: {
		cents: number;
		currency: Currency;
		tone?: 'stock' | 'flow';
		direction?: 'income' | 'outcome' | 'transfer';
		as?: 'p' | 'dd';
		class?: string;
	} = $props();

	let chars = $derived(formatMoney(cents, currency).length);
</script>

<svelte:element this={as} class="hero hero-amount {className}" style:--chars={chars}>
	<span class="fit"><Money {cents} {currency} {tone} {direction} /></span>
</svelte:element>

<style>
	.hero {
		margin: var(--space-1) 0 0;
		max-width: 100%;
		container-type: inline-size;
		font-family: var(--font-display);
		font-size: var(--font-size-hero);
		font-weight: 500;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	/* Raised, half-size currency symbol; the text stays "$1.234" for screen readers. */
	.hero :global(.sym) {
		font-size: 0.5em;
		vertical-align: 0.8em;
		line-height: 0;
		margin-right: 0.06em;
	}

	/* Geist Mono advances 0.58em per glyph with the -0.02em tracking; 0.59 keeps a hair of margin. */
	.fit {
		font-size: min(var(--font-size-hero), calc(100cqi / (var(--chars) * 0.59)));
	}
</style>
