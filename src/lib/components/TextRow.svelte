<script lang="ts">
	import { groupedAmount } from '$lib/amount-input';

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
		amount = false
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
	} = $props();
</script>

<div class="wrap">
	<label class="row" for={id}>
		<span class="k">{label}</span>
		<input
			{id}
			{name}
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
	{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
</div>

<style>
	.row {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
		color: var(--text);
		cursor: text;
	}

	.k {
		flex: none;
	}

	.row input {
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

	.row input::placeholder {
		color: var(--text-muted);
		opacity: 1;
	}

	.row input:focus-visible {
		outline-offset: -2px;
	}

	.error {
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
