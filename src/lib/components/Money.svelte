<script lang="ts">
	import { formatMoney } from '$lib/money';

	/** Amount with the decimals dimmed ("US$ 1.250" + ",50"). Font size and weight come from the parent. */
	let {
		cents,
		currency,
		kind = 'plain'
	}: {
		cents: number;
		currency: 'ARS' | 'USD';
		kind?: 'income' | 'outcome' | 'transfer' | 'plain';
	} = $props();

	// formatMoney joins the symbol and the number with an NBSP; split there so only that gap can wrap.
	let parts = $derived(
		formatMoney(cents, currency, { sign: kind === 'income' ? 'always' : 'auto' }).split(' ')
	);
	let num = $derived(parts[1]);
	// ARS has no decimal part: cut at the end.
	let cut = $derived(num.includes(',') ? num.lastIndexOf(',') : num.length);
	// Thousands groups of the integer part; the only break points inside the number are after each ".".
	let groups = $derived(num.slice(0, cut).split('.'));
</script>

<span class="money amount {kind}"
	>{parts[0]}
	<span class="num"
		>{#each groups as g, i (i)}{g}{#if i < groups.length - 1}.<wbr />{/if}{/each}<span class="dec"
			>{num.slice(cut)}</span
		></span
	></span
>

<style>
	.money {
		white-space: normal;
	}

	.income {
		color: var(--positive);
	}

	.transfer {
		color: var(--transfer);
	}

	/* Dimmed only on text colour (>= 4.5:1 at 0.7); coloured income/transfer decimals stay full strength. */
	.outcome .dec,
	.plain .dec {
		opacity: 0.7;
	}
</style>
