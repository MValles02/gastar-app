<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { CalendarDate, parseDate } from '@internationalized/date';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import BottomDrawer from './BottomDrawer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { formatDay } from '$lib/locale';

	let {
		name,
		label,
		value = $bindable(''),
		min,
		max,
		error,
		errorId
	}: {
		name: string;
		label: string;
		/** `YYYY-MM-DD`, or '' when empty. */
		value?: string;
		/** Earliest pickable day, `YYYY-MM-DD`. */
		min?: string;
		/** Latest pickable day, `YYYY-MM-DD`. */
		max?: string;
		error?: string;
		errorId?: string;
	} = $props();

	let mounted = $state(false);
	let open = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	let hidden: HTMLInputElement | null = $state(null);
	const labelId = $props.id();

	onMount(() => (mounted = true));

	// An invalid value (e.g. an echoed bad date) is shown as empty until a day is picked.
	function toDate(ymd: string | undefined) {
		try {
			return ymd ? parseDate(ymd) : undefined;
		} catch {
			return undefined;
		}
	}
	const selected = $derived(toDate(value));
	const minValue = $derived(toDate(min) ?? new CalendarDate(1900, 1, 1));
	const maxValue = $derived(toDate(max));

	async function choose(day: string) {
		value = day;
		open = false;
		await tick();
		// The hidden input carries the new value; let ancestors (e.g. a filter form) see a change.
		hidden?.dispatchEvent(new Event('change', { bubbles: true }));
		trigger?.focus();
	}
</script>

{#if mounted}
	<div class="field">
		<Button
			variant="ghost"
			class="h-14 w-full scroll-mb-24 justify-between gap-3 rounded-none px-4"
			aria-haspopup="dialog"
			aria-labelledby="{labelId} {labelId}-value"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? errorId : undefined}
			bind:ref={trigger}
			onclick={() => (open = true)}
		>
			<span class="label" id={labelId}>{label}</span>
			<span id="{labelId}-value" class="current" class:placeholder={!selected}>
				{selected ? formatDay(value) : 'Elegir fecha'}
			</span>
			<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="chev" />
		</Button>
		<!-- The Drawer is portaled out of the form, so the value submits through this input. -->
		<input type="hidden" {name} {value} bind:this={hidden} />
		{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
	</div>
	<BottomDrawer title={label} bind:open>
		<Calendar
			type="single"
			value={selected}
			{minValue}
			{maxValue}
			initialFocus
			onValueChange={(v) => v && choose(v.toString())}
		/>
	</BottomDrawer>
{:else}
	<div class="field native">
		<label for="{labelId}-native">{label}</label>
		<input id="{labelId}-native" type="date" {name} {min} {max} bind:value />
		{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
	</div>
{/if}

<style>
	.field {
		display: flex;
		flex-direction: column;
	}

	.native {
		gap: var(--space-1);
		padding: var(--space-4);
	}

	.label,
	label {
		font-size: var(--font-size-base);
		color: var(--text);
	}

	.label {
		flex: none;
	}

	.current {
		flex: 1;
		min-width: 0;
		text-align: right;
		font-weight: 500;
	}

	.placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	.field :global(.chev) {
		flex: none;
		color: var(--text-muted);
	}

	.error {
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.native .error {
		padding: 0;
	}
</style>
