<script lang="ts">
	import { appear } from '#lib/motion.ts';
	import { today } from '@internationalized/date';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { Calendar } from '#lib/components/ui/calendar/index.js';
	import { calendarFloor, toCalendarDate } from '#lib/dates.ts';
	import { APP_TZ, formatDay } from '#lib/locale.ts';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import OptionList from './OptionList.svelte';
	import { commitPick } from './pick.ts';
	import PickerTrigger from './PickerTrigger.svelte';

	/**
	 * Date row that opens a month calendar in a drawer. With `presets`, the drawer lists Hoy and Ayer
	 * (one tap picks and closes) and "Otra fecha", which reveals the calendar under the list. Without
	 * JavaScript: a native date input.
	 */
	let {
		name,
		label,
		value = $bindable(''),
		min,
		max,
		error,
		errorId,
		presets = false,
		nested = false,
		onclosed,
		plain = false
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
		/** Hoy / Ayer / Otra fecha shortcuts above the calendar (the movement date). */
		presets?: boolean;
		/** Opens the drawer stacked over the one this row is rendered in. */
		nested?: boolean;
		/** Runs once the drawer has finished closing. */
		onclosed?: () => void;
		/** With `presets`, the row still reads dd/mm/yyyy (no Hoy/Ayer); the drawer keeps its shortcuts. */
		plain?: boolean;
	} = $props();

	const mounted = hydrated();
	let open = $state(false);
	let other = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	let hidden: HTMLInputElement | null = $state(null);
	const labelId = $props.id();

	const todayYmd = today(APP_TZ).toString();
	const yesterdayYmd = today(APP_TZ).subtract({ days: 1 }).toString();
	const dm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

	const selected = $derived(toCalendarDate(value));
	const minValue = $derived(calendarFloor(min));
	const maxValue = $derived(toCalendarDate(max));
	const text = $derived(
		!selected
			? 'Elegir fecha'
			: !presets || plain
				? formatDay(value)
				: value === todayYmd
					? `Hoy, ${dm(value)}`
					: value === yesterdayYmd
						? `Ayer, ${dm(value)}`
						: formatDay(value)
	);

	type Shortcut = { day: string | null; title: string; meta?: string };
	const shortcuts: Shortcut[] = $derived([
		{ day: todayYmd, title: 'Hoy', meta: dm(todayYmd) },
		{ day: yesterdayYmd, title: 'Ayer', meta: dm(yesterdayYmd) },
		{
			day: null,
			title: 'Otra fecha',
			meta:
				other && selected && value !== todayYmd && value !== yesterdayYmd ? dm(value) : undefined
		}
	]);

	function openSheet() {
		if (presets) other = !!selected && value !== todayYmd && value !== yesterdayYmd;
		open = true;
	}

	const choose = (day: string) =>
		commitPick({
			set: () => (value = day),
			close: () => (open = false),
			changeFrom: hidden,
			trigger
		});
</script>

{#if mounted.current}
	<div class="field">
		<PickerTrigger
			{labelId}
			{label}
			value={text}
			placeholder={!selected}
			invalid={!!error}
			describedBy={error ? errorId : undefined}
			bind:ref={trigger}
			onclick={openSheet}
		/>
		<!-- The Drawer is portaled out of the form, so the value submits through this input. -->
		<input type="hidden" {name} {value} bind:this={hidden} />
		{#if error}<p class="error" id={errorId} role="alert" in:appear>{error}</p>{/if}
	</div>
	<BottomDrawer title={label} {nested} {onclosed} bind:open>
		{#if presets}
			<OptionList
				items={shortcuts}
				key={(s) => s.title}
				title={(s) => s.title}
				meta={(s) => s.meta}
				on={(s) => (s.day ? !other && value === s.day : other)}
				onpick={(s) => (s.day ? choose(s.day) : (other = true))}
			/>
		{/if}
		{#if !presets || other}
			<Calendar
				type="single"
				value={selected}
				{minValue}
				{maxValue}
				captionLayout={presets ? 'label' : undefined}
				class={presets ? 'mt-3' : undefined}
				initialFocus
				onValueChange={(v) => v && choose(v.toString())}
			/>
		{/if}
	</BottomDrawer>
{:else}
	<div class="field native">
		<label for="{labelId}-native">{label}</label>
		<input id="{labelId}-native" type="date" {name} {min} {max} bind:value />
		{#if error}<p class="error" id={errorId} role="alert" in:appear>{error}</p>{/if}
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

	label {
		font-size: var(--font-size-base);
		color: var(--text);
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
