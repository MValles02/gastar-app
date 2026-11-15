<script lang="ts">
	import type { Currency } from '#lib/money.ts';
	import DetailHero from '#lib/components/DetailHero.svelte';
	import HeroAmount from '#lib/components/HeroAmount.svelte';
	import Money from '#lib/components/Money.svelte';

	/** A category's month: net spend (outcomes - incomes) per currency as a cash flow, spend in red. */
	let { label, nets }: { label: string; nets: { currency: Currency; net: number }[] } = $props();

	const single = $derived(nets.length === 1 ? nets[0] : null);
</script>

<DetailHero ariaLabel="Resumen del mes" {label}>
	{#if single}
		<HeroAmount cents={-single.net} currency={single.currency} tone="flow" />
	{:else if nets.length === 0}
		<p class="muted">Sin movimientos en este mes.</p>
	{:else}
		<dl class="duo">
			{#each nets as n (n.currency)}
				<div>
					<dt>{n.currency}</dt>
					<dd class="amount"><Money cents={-n.net} currency={n.currency} tone="flow" /></dd>
				</div>
			{/each}
		</dl>
	{/if}
</DetailHero>

<style>
	.duo {
		align-self: stretch;
		margin: 0;
	}

	.duo div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.duo dd {
		font-family: var(--font-display);
		font-size: var(--font-size-xl);
		font-weight: 500;
	}

	.muted {
		color: var(--text-muted);
	}

	.amount {
		white-space: nowrap;
	}
</style>
