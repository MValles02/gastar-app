<script lang="ts">
	import { formatMoney } from '$lib/money';
	import Money from './Money.svelte';

	/** The big display amount of Inicio, Plan and Reportes; steps down a size once the formatted amount passes 11 characters. */
	let {
		cents,
		currency,
		kind = 'plain',
		as = 'p',
		class: className = ''
	}: {
		cents: number;
		currency: 'ARS' | 'USD';
		kind?: 'income' | 'outcome' | 'transfer' | 'plain';
		as?: 'p' | 'dd';
		class?: string;
	} = $props();

	let small = $derived(formatMoney(cents, currency).length > 11);
</script>

<svelte:element this={as} class="hero hero-amount {className}" class:small>
	<Money {cents} {currency} {kind} />
</svelte:element>

<style>
	.hero {
		margin: var(--space-1) 0 0;
		max-width: 100%;
		font-family: var(--font-display);
		font-size: 2.75rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	.hero.small {
		font-size: 2.25rem;
	}
</style>
