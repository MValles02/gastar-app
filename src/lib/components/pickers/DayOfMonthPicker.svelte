<script lang="ts">
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { hydrated } from './hydrated.svelte.ts';
	import { commitPick } from './pick.ts';
	import PickerTrigger from './PickerTrigger.svelte';

	/**
	 * "Día del mes" row: opens a 1-31 grid (31 means the month's last day; the server clamps it). Posts
	 * `dayOfMonth` through a hidden input, as the drawer is portaled out of any form. Without JavaScript: a
	 * number input.
	 */
	let {
		value = $bindable(''),
		error,
		errorId,
		nested = false
	}: {
		/** The day as text ("5"), or '' when none. */
		value?: string;
		error?: string;
		errorId?: string;
		/** Opens the grid stacked over the drawer this row is rendered in. */
		nested?: boolean;
	} = $props();

	const labelId = $props.id();
	const mounted = hydrated();
	let open = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);

	const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

	const choose = (d: string) =>
		commitPick({
			set: () => (value = d),
			close: () => (open = false),
			changeFrom: false,
			trigger
		});
</script>

{#if mounted.current}
	<PickerTrigger
		{labelId}
		label="Día del mes"
		labelClass="text-base font-normal"
		value={value || 'Elegir'}
		placeholder={!value}
		strongPlaceholder
		describedBy={error ? errorId : undefined}
		bind:ref={trigger}
		onclick={() => (open = true)}
	/>
	<input type="hidden" name="dayOfMonth" {value} />
	<BottomDrawer title="Día del mes" {nested} bind:open>
		<div class="days">
			{#each days as d (d)}
				<Button
					type="button"
					variant={d === value ? 'default' : 'ghost'}
					class="h-10 rounded-full px-0 text-[15px] {d === value ? 'font-semibold' : 'font-normal'}"
					aria-pressed={d === value}
					onclick={() => choose(d)}>{d}</Button
				>
			{/each}
		</div>
		<p class="hint">Si el mes tiene menos días, se usa el último.</p>
	</BottomDrawer>
{:else}
	<label class="row" for="{labelId}-native">
		<span>Día del mes</span>
		<input
			id="{labelId}-native"
			name="dayOfMonth"
			type="number"
			inputmode="numeric"
			min="1"
			max="31"
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
