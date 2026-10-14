<script lang="ts">
	import type { Currency } from '$lib/money';
	import { formatMoney } from '$lib/money';

	/**
	 * Amount with the decimals dimmed ("US$1.250" + ",50"). Font size and weight come from the parent.
	 * No visible sign: colour carries the direction (income green, outcome red, transfer blue); a
	 * negative `plain` amount reads as an outcome. `signed` colours by the sign of `cents` (>0 green,
	 * <0 red, 0 neutral). The sign stays for screen readers.
	 */
	let {
		cents,
		currency,
		kind = 'plain'
	}: {
		cents: number;
		currency: Currency;
		kind?: 'income' | 'outcome' | 'transfer' | 'plain' | 'signed';
	} = $props();

	let tone = $derived(
		kind === 'signed'
			? cents > 0
				? 'income'
				: cents < 0
					? 'outcome'
					: 'plain'
			: kind === 'plain' && cents < 0
				? 'outcome'
				: kind
	);
	let srSign = $derived(cents < 0 ? '-' : kind === 'income' && cents > 0 ? '+' : '');
	// formatMoney glues the symbol to the number ("US$1.250,50"); the symbol is everything before the first digit.
	let text = $derived(formatMoney(cents, currency));
	let symbol = $derived(text.slice(0, text.search(/\d/)));
	let num = $derived(text.slice(symbol.length));
	// ARS has no decimal part: cut at the end.
	let cut = $derived(num.includes(',') ? num.lastIndexOf(',') : num.length);
</script>

<span class="money amount {tone}"
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

	.transfer {
		color: var(--transfer);
	}

	/* Dimmed only on text colour (>= 4.5:1 at 0.7); coloured decimals stay full strength. */
	.plain .dec {
		opacity: 0.7;
	}
</style>
