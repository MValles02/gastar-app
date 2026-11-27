<script lang="ts">
	import type { Currency } from '#lib/money.ts';
	import Tile from '#lib/components/base/Tile.svelte';
	import Amount from '#lib/components/base/Amount.svelte';
	import { signTone } from '#lib/money.ts';

	/** A category's month: net spend (outcomes - incomes) per currency as a cash flow, spend in red. */
	let { label, nets }: { label: string; nets: { currency: Currency; net: number }[] } = $props();

	const single = $derived(nets.length === 1 ? nets[0] : null);
</script>

<Tile align="center" ariaLabel="Resumen del mes" caption={label}>
	{#if single}
		<Amount
			size="hero"
			as="p"
			cents={-single.net}
			currency={single.currency}
			tone={signTone(-single.net)}
		/>
	{:else if nets.length === 0}
		<p class="muted">Sin movimientos en este mes.</p>
	{:else}
		<dl class="duo">
			{#each nets as n (n.currency)}
				<div>
					<dt>{n.currency}</dt>
					<dd class="amount">
						<Amount cents={-n.net} currency={n.currency} tone={signTone(-n.net)} />
					</dd>
				</div>
			{/each}
		</dl>
	{/if}
</Tile>

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
