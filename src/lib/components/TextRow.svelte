<script lang="ts">
	import type { Snippet } from 'svelte';
	import { groupedAmount } from '#lib/amount-input.ts';

	/** Inline form row: label left, borderless right-aligned input right (G6). */
	let {
		id,
		name,
		label,
		value = $bindable(),
		placeholder,
		maxlength,
		inputmode,
		required = false,
		error,
		errorId,
		amount = false,
		form,
		prefix,
		end
	}: {
		id: string;
		name: string;
		label: string;
		value: string;
		placeholder?: string;
		maxlength?: number;
		inputmode?: 'numeric' | 'decimal' | 'text';
		required?: boolean;
		error?: string;
		errorId?: string;
		/** Group thousands as the user types (whole-pesos / decimal amounts). */
		amount?: boolean;
		/** `id` of a `<form>` elsewhere in the page this input submits with. */
		form?: string;
		/** Muted text before the input (e.g. the currency symbol), so an empty row reads "$ 0". */
		prefix?: string;
		/** Content after the input, inside the row (sibling of the label). */
		end?: Snippet;
	} = $props();
</script>

<div class="wrap">
	<div class="row">
		<label class="lbl" class:has-prefix={!!prefix} for={id}>
			<span class="k">{label}</span>
			{#if prefix}<span class="prefix">{prefix}</span>{/if}
			<input
				{id}
				{name}
				{form}
				type="text"
				{maxlength}
				{inputmode}
				{required}
				{placeholder}
				autocomplete="off"
				bind:value
				{@attach (node) => (amount ? groupedAmount(node) : undefined)}
				aria-invalid={error ? 'true' : undefined}
				aria-describedby={error ? errorId : undefined}
			/>
		</label>
		{#if end}{@render end()}{/if}
	</div>
	{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
</div>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: 0 var(--space-4);
	}

	.lbl {
		display: flex;
		flex: 1 1 0;
		min-width: 0;
		flex-direction: row;
		align-items: center;
		gap: var(--space-3);
		min-height: 3.5rem;
		font-size: var(--font-size-base);
		color: var(--text);
		cursor: text;
	}

	.prefix {
		flex: none;
		margin-inline-start: auto;
		margin-inline-end: calc(var(--space-3) * -1 + 0.25rem);
		color: var(--text-muted);
	}

	/* The prefix hugs the (right-aligned) value. */
	.has-prefix input {
		flex: 0 1 auto;
		field-sizing: content;
		min-width: 1ch;
	}

	.k {
		flex: none;
	}

	.lbl input {
		flex: 1 1 4rem;
		min-width: 0;
		width: auto;
		min-height: 3.5rem;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		text-align: right;
		scroll-margin-bottom: 6rem;
	}

	.lbl input::placeholder {
		color: var(--text-muted);
		opacity: 1;
	}

	.lbl input:focus-visible {
		outline-offset: -2px;
		/* The ring follows the card's rounding instead of a square box. */
		border-radius: var(--radius-sm);
	}

	.error {
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
