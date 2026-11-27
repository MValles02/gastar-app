<script lang="ts">
	import { cssVars } from '#lib/css-vars.ts';
	import { formatMoney, type Currency } from '#lib/money.ts';

	/**
	 * Amount with the decimals dimmed ("US$1.250" + ",50"). No visible sign: colour carries it
	 * (`tone` income/expense; neutral inherits the text colour). Zero is always neutral. The sign
	 * stays for screen readers. `hero` shrinks only when the amount would overflow its box.
	 */
	let {
		cents,
		currency,
		tone,
		size = 'inline',
		as = 'span'
	}: {
		cents: number;
		currency: Currency;
		tone?: 'income' | 'expense' | 'neutral';
		size?: 'inline' | 'row' | 'tile' | 'hero';
		as?: 'span' | 'p' | 'dd';
	} = $props();

	const effective = $derived(
		cents === 0 ? 'neutral' : (tone ?? (cents < 0 ? 'expense' : 'neutral'))
	);
	const srSign = $derived(cents < 0 ? '-' : effective === 'income' && cents > 0 ? '+' : '');
	// formatMoney glues the symbol to the number ("US$1.250,50"); the symbol is everything before the first digit.
	const text = $derived(formatMoney(cents, currency));
	const symbol = $derived(text.slice(0, text.search(/\d/)));
	const num = $derived(text.slice(symbol.length));
	// ARS has no decimal part: cut at the end.
	const cut = $derived(num.includes(',') ? num.lastIndexOf(',') : num.length);
</script>

{#snippet parts()}
	{#if srSign}<span class="visually-hidden">{srSign}</span>{/if}{#if symbol}<span class="sym"
			>{symbol}</span
		>{/if}<span class="num">{num.slice(0, cut)}<span class="dec">{num.slice(cut)}</span></span>
{/snippet}

<svelte:element
	this={as}
	class="amount"
	data-tone={effective}
	data-size={size}
	{@attach size === 'hero' ? cssVars({ '--chars': String(text.length) }) : undefined}
>
	{#if size === 'hero'}<span class="fit">{@render parts()}</span>{:else}{@render parts()}{/if}
</svelte:element>

<style>
	.amount {
		white-space: nowrap;
	}

	.amount:not([data-tone='neutral']) {
		color: var(--tone);
	}

	/* Neutral decimals take the muted token (AA on every surface, also inside an already-muted
	   parent, where an opacity dim fell below 4.5:1); coloured decimals stay full strength. */
	.amount[data-tone='neutral'] .dec {
		color: var(--text-muted);
	}

	.amount[data-size='row'] {
		font-family: var(--font-display);
		font-size: var(--font-size-base);
		font-weight: 500;
	}

	.amount[data-size='tile'] {
		font-family: var(--font-display);
		font-size: var(--font-size-lg);
		font-weight: 500;
	}

	.amount[data-size='hero'] {
		display: block;
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
	.amount[data-size='hero'] .sym {
		font-size: 0.5em;
		vertical-align: 0.8em;
		line-height: 0;
		margin-right: 0.06em;
	}

	.fit {
		font-size: min(var(--font-size-hero), calc(100cqi / (var(--chars) * var(--hero-advance))));
	}
</style>
