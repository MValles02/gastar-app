<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import { MAX_DAY_OF_MONTH } from '#lib/constants.ts';
	import Picker from './Picker.svelte';

	/**
	 * "Día del mes" row: opens a grid of the days 1 to MAX_DAY_OF_MONTH (the last one means the month's last day; the server clamps it). Posts
	 * `dayOfMonth` through a hidden input, as the drawer is portaled out of any form. Without JavaScript: a
	 * number input.
	 */
	let {
		value = $bindable(''),
		error
	}: {
		/** The day as text ("5"), or '' when none. */
		value?: string;
		error?: string;
	} = $props();

	const labelId = $props.id();
	const errorId = `${labelId}-error`;
	const mounted = hydrated();

	const days = Array.from({ length: MAX_DAY_OF_MONTH }, (_, i) => String(i + 1));
</script>

{#if mounted.current}
	<Picker
		{labelId}
		label="Día del mes"
		labelClass="text-base font-normal"
		value={value || 'Elegir'}
		placeholder={!value}
		strongPlaceholder
		describedBy={error ? errorId : undefined}
	>
		{#snippet children(pick)}
			<div class="days">
				{#each days as d (d)}
					<Button
						type="button"
						variant={d === value ? 'default' : 'ghost'}
						class="h-10 rounded-full px-0 text-[15px] {d === value
							? 'font-semibold'
							: 'font-normal'}"
						aria-pressed={d === value}
						onclick={() => pick(() => (value = d))}>{d}</Button
					>
				{/each}
			</div>
			<p class="hint">Si el mes tiene menos días, se usa el último.</p>
		{/snippet}
	</Picker>
	<input type="hidden" name="dayOfMonth" {value} />
{:else}
	<label class="row" for="{labelId}-native">
		<span>Día del mes</span>
		<input
			id="{labelId}-native"
			name="dayOfMonth"
			type="number"
			inputmode="numeric"
			min="1"
			max={MAX_DAY_OF_MONTH}
			{value}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? errorId : undefined}
		/>
	</label>
{/if}
{#if error}
	<p class="error" id={errorId} role="alert">{error}</p>
{/if}

<style>
	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
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
	}

	.days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
	}

	.hint {
		margin: var(--space-3) 0 0;
		color: var(--text-muted);
		font-size: 13px;
		text-align: left;
	}

	.error {
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
