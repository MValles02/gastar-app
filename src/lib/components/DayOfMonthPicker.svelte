<script lang="ts">
	import { onMount, tick } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import BottomDrawer from './BottomDrawer.svelte';

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

	let mounted = $state(false);
	let open = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	onMount(() => (mounted = true));

	const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

	async function choose(d: string) {
		value = d;
		open = false;
		await tick();
		trigger?.focus();
	}
</script>

{#if mounted}
	<Button
		variant="ghost"
		class="h-14 w-full scroll-mb-24 justify-between gap-3 rounded-none px-4"
		aria-haspopup="dialog"
		aria-labelledby="rday-label rday-value"
		aria-describedby={error ? errorId : undefined}
		bind:ref={trigger}
		onclick={() => (open = true)}
	>
		<span id="rday-label" class="text-base font-normal">Día del mes</span>
		<span id="rday-value" class="flex-1 text-right" class:text-muted-foreground={!value}>
			{value || 'Elegir'}
		</span>
		<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="text-muted-foreground" />
	</Button>
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
	<label class="row" for="rday">
		<span>Día del mes</span>
		<input
			id="rday"
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
