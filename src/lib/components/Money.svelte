<script lang="ts">
	import type { Currency } from '$lib/money';
	import { formatMoney } from '$lib/money';

	/**
	 * Amount with the decimals dimmed ("US$1.250" + ",50"). Font size and weight come from the parent.
	 * No visible sign: colour carries it. `stock` (balances, totals): text colour, red when negative.
	 * `flow` (movements): income green, outcome red, transfer text colour; without `direction` it
	 * follows the sign of `cents`. Zero is always neutral. The sign stays for screen readers.
	 */
	let {
		cents,
		currency,
		tone = 'stock',
		direction
	}: {
		cents: number;
		currency: Currency;
		tone?: 'stock' | 'flow';
		direction?: 'income' | 'outcome' | 'transfer';
	} = $props();

	let color = $derived(
		cents === 0 || direction === 'transfer'
			? 'neutral'
			: tone === 'flow' && direction
				? direction === 'income'
					? 'income'
					: 'outcome'
				: tone === 'flow' && cents > 0
					? 'income'
					: cents < 0
						? 'outcome'
						: 'neutral'
	);
	let srSign = $derived(cents < 0 ? '-' : direction === 'income' && cents > 0 ? '+' : '');
	// formatMoney glues the symbol to the number ("US$1.250,50"); the symbol is everything before the first digit.
	let text = $derived(formatMoney(cents, currency));
	let symbol = $derived(text.slice(0, text.search(/\d/)));
	let num = $derived(text.slice(symbol.length));
	// ARS has no decimal part: cut at the end.
	let cut = $derived(num.includes(',') ? num.lastIndexOf(',') : num.length);
</script>

<span class="money amount {color}"
	>{#if srSign}<span class="visually-hidden">{srSign}</span>{/if}{symbol}<span class="num"
		>{num.slice(0, cut)}<span class="dec">{num.slice(cut)}</span></span
	></span
>

<style>
	.money {
		white-space: nowrap;
	}

	.income {
		color: var(--positive);
	}

	.outcome {
		color: var(--negative);
	}

	/* Dimmed only on text colour (>= 4.5:1 at 0.7); coloured decimals stay full strength. */
	.neutral .dec {
		opacity: 0.7;
	}
</style>
