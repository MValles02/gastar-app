<script lang="ts">
	import { endOfMonth, startOfMonth, today } from '@internationalized/date';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Item from '#lib/components/ui/item/index.js';
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.js';
	import { thisMonth, toCalendarDate } from '#lib/dates.ts';
	import { APP_TZ, formatDay } from '#lib/locale.ts';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import OptionList from './OptionList.svelte';
	import Picker, { type Pick } from './Picker.svelte';

	let {
		from = $bindable(''),
		to = $bindable('')
	}: {
		/** `YYYY-MM-DD`, or '' when empty. */
		from?: string;
		/** `YYYY-MM-DD`, or '' when empty. */
		to?: string;
	} = $props();

	const mounted = hydrated();
	let open = $state(false);
	let custom = $state(false);
	let hidden: HTMLInputElement | null = $state(null);
	const labelId = $props.id();

	const presets = [
		{
			label: 'Este mes',
			range: thisMonth
		},
		{
			label: 'Mes pasado',
			range: () => {
				const prev = startOfMonth(today(APP_TZ)).subtract({ months: 1 });
				return [prev, endOfMonth(prev)];
			}
		},
		{
			label: 'Últimos 30 días',
			range: () => {
				const t = today(APP_TZ);
				return [t.subtract({ days: 29 }), t];
			}
		}
	];
	const range = $derived({ start: toCalendarDate(from), end: toCalendarDate(to) });
	// A range that equals a preset reads as the preset ("Este mes").
	const presetLabel = $derived(
		from && to
			? presets.find((p) => {
					const [s, e] = p.range();
					return s.toString() === from && e.toString() === to;
				})?.label
			: undefined
	);
	const summary = $derived(
		presetLabel
			? presetLabel
			: from && to
				? from === to
					? formatDay(from)
					: `${formatDay(from)} – ${formatDay(to)}`
				: from
					? `Desde ${formatDay(from)}`
					: to
						? `Hasta ${formatDay(to)}`
						: ''
	);

	const apply = (pick: Pick, f: string, t: string) =>
		pick(() => {
			from = f;
			to = t;
		});
</script>

{#snippet chevron(p: { range: unknown })}
	{#if !p.range}
		<Item.Actions><ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" /></Item.Actions>
	{/if}
{/snippet}

{#snippet body(pick: Pick)}
	{#if custom}
		<RangeCalendar
			value={range}
			onValueChange={(v) => v.start && v.end && apply(pick, v.start.toString(), v.end.toString())}
		/>
		<Button variant="ghost" class="mt-3 h-11 w-full" onclick={() => (custom = false)}>
			Volver
		</Button>
	{:else}
		<OptionList
			items={[...presets, { label: 'Personalizado', range: null }]}
			key={(p) => p.label}
			title={(p) => p.label}
			on={(p) => (p.range ? presetLabel === p.label : !!summary && !presetLabel)}
			onpick={(p) => {
				if (!p.range) return (custom = true);
				const [s, e] = p.range();
				apply(pick, s.toString(), e.toString());
			}}
			end={chevron}
		/>
	{/if}
	{#if from || to}
		<Button variant="outline" class="mt-3 h-11 w-full" onclick={() => apply(pick, '', '')}>
			Quitar fechas
		</Button>
	{/if}
{/snippet}

{#if mounted.current}
	<div class="field">
		<Picker
			{labelId}
			label="Fechas"
			value={summary || 'Todas'}
			placeholder={!summary}
			changeFrom={hidden}
			onopen={() => (custom = false)}
			children={body}
			bind:open
		/>
		<!-- The Drawer is portaled out of the form, so the values submit through these inputs. -->
		<input type="hidden" name="from" value={from} disabled={!from} bind:this={hidden} />
		<input type="hidden" name="to" value={to} disabled={!to} />
	</div>
{:else}
	<fieldset class="native">
		<legend>Fechas</legend>
		<label>Desde <input type="date" name="from" bind:value={from} /></label>
		<label>Hasta <input type="date" name="to" bind:value={to} /></label>
	</fieldset>
{/if}

<style>
	.field {
		display: flex;
		flex-direction: column;
	}

	.native {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: var(--space-4);
		border: 0;
	}

	legend,
	.native label {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}
</style>
