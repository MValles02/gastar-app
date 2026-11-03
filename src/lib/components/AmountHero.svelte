<script lang="ts">
	import { groupedAmount } from '$lib/amount-input';
	import type { Currency } from '$lib/money';

	/** Big centered amount (no label, no box). The accessible name is "Monto". */
	let {
		value = $bindable(),
		currency,
		error,
		name = 'amount',
		id = 'amount',
		autofocus = false,
		color
	}: {
		value: string;
		currency?: Currency;
		error?: string;
		name?: string;
		id?: string;
		autofocus?: boolean;
		/** CSS colour of the digits (e.g. by movement type); defaults to the text colour. */
		color?: string;
	} = $props();
</script>

<div class="amount-block">
	<label class="amount" class:sm={value.length > 11} style:--amount-color={color}>
		<span class="visually-hidden">Monto</span>
		<span class="currency">{currency === 'USD' ? 'US$' : '$'}</span>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			{id}
			{name}
			class="amount-input"
			type="text"
			inputmode={currency === 'USD' ? 'decimal' : 'numeric'}
			placeholder={currency === 'USD' ? '0,00' : '0'}
			autocomplete="off"
			{autofocus}
			bind:value
			{@attach groupedAmount}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
		/>
	</label>
	{#if error}<p class="error" id="{id}-error" role="alert">{error}</p>{/if}
</div>

<style>
	.amount-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.amount {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		justify-content: center;
		gap: var(--space-2);
		max-width: 100%;
		padding: var(--space-4) 0 var(--space-1);
		color: var(--text);
		border-bottom: 2px solid transparent;
	}

	/* No box on the input: the underline and the caret are the focus cue. */
	.amount:focus-within {
		border-bottom-color: var(--primary);
	}

	.currency {
		font-family: var(--font-display);
		font-size: var(--font-size-lg);
		font-weight: 500;
		color: var(--text-muted);
	}

	.amount .amount-input {
		flex: 0 1 auto;
		width: auto;
		min-width: 2ch;
		max-width: 100%;
		field-sizing: content;
		min-height: 3.5rem;
		padding: 0 var(--space-1);
		border: 0;
		outline: none;
		box-shadow: none;
		caret-color: var(--primary);
		color: var(--amount-color, var(--text));
		background: transparent;
		font-family: var(--font-display);
		font-size: var(--font-size-hero);
		font-weight: 500;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.amount.sm .amount-input {
		font-size: var(--font-size-hero);
	}

	.amount .amount-input::placeholder {
		color: var(--text-muted);
		opacity: 1;
	}

	.error {
		text-align: center;
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
