<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { CalendarDate, parseDate, today } from '@internationalized/date';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import BottomDrawer from './BottomDrawer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import { formatDay } from '$lib/locale';

	/**
	 * Movement date row. The drawer lists Hoy and Ayer (one tap picks and closes) and "Otra fecha", which
	 * reveals a Monday-first month calendar under the list. Without JavaScript: a native date input.
	 */
	let {
		name,
		label,
		value = $bindable(''),
		min,
		error,
		errorId,
		nested = false
	}: {
		name: string;
		label: string;
		/** `YYYY-MM-DD`, or '' when empty. */
		value?: string;
		/** Earliest pickable day, `YYYY-MM-DD`. */
		min?: string;
		error?: string;
		errorId?: string;
		/** Opens the drawer stacked over the one this row is rendered in. */
		nested?: boolean;
	} = $props();

	let mounted = $state(false);
	let open = $state(false);
	let other = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	let hidden: HTMLInputElement | null = $state(null);
	const labelId = $props.id();

	onMount(() => (mounted = true));

	const TZ = 'America/Argentina/Buenos_Aires';
	const todayYmd = today(TZ).toString();
	const yesterdayYmd = today(TZ).subtract({ days: 1 }).toString();
	const dm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

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
	const text = $derived(
		!selected
			? 'Elegir fecha'
			: value === todayYmd
				? `Hoy, ${dm(value)}`
				: value === yesterdayYmd
					? `Ayer, ${dm(value)}`
					: formatDay(value)
	);

	function openSheet() {
		other = !!selected && value !== todayYmd && value !== yesterdayYmd;
		open = true;
	}

	async function choose(day: string) {
		value = day;
		open = false;
		await tick();
		hidden?.dispatchEvent(new Event('change', { bubbles: true }));
		trigger?.focus();
	}
</script>

{#snippet option(day: string | null, title: string, meta?: string)}
	{@const on = day ? value === day : other}
	<Item.Root>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="opt {props.class}"
				aria-pressed={on}
				onclick={() => (day ? choose(day) : (other = true))}
			>
				<Item.Content><Item.Title>{title}</Item.Title></Item.Content>
				{#if meta}<Item.Actions class="tabular-nums">{meta}</Item.Actions>{/if}
				{#if on && !meta}<Item.Actions
						><Check size={20} strokeWidth={1.75} aria-hidden="true" /></Item.Actions
					>{/if}
			</button>
		{/snippet}
	</Item.Root>
{/snippet}

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
			onclick={openSheet}
		>
			<span class="label" id={labelId}>{label}</span>
			<span id="{labelId}-value" class="current" class:placeholder={!selected}>{text}</span>
			<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="chev" />
		</Button>
		<!-- The Drawer is portaled out of the form, so the value submits through this input. -->
		<input type="hidden" {name} {value} bind:this={hidden} />
		{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
	</div>
	<BottomDrawer title={label} {nested} bind:open>
		<div class="options">
			{@render option(todayYmd, 'Hoy', dm(todayYmd))}
			{@render option(yesterdayYmd, 'Ayer', dm(yesterdayYmd))}
			{@render option(null, 'Otra fecha')}
		</div>
		{#if other}
			<Calendar
				type="single"
				value={selected}
				{minValue}
				initialFocus
				onValueChange={(v) => v && choose(v.toString())}
			/>
		{/if}
	</BottomDrawer>
{:else}
	<div class="field native">
		<label for="{labelId}-native">{label}</label>
		<input id="{labelId}-native" type="date" {name} {min} bind:value />
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

	.options {
		display: flex;
		flex-direction: column;
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
