<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { endOfMonth, parseDate, startOfMonth, today } from '@internationalized/date';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import BottomDrawer from './BottomDrawer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import { formatDay } from '$lib/locale';

	let {
		legend = 'Fechas',
		from = $bindable(''),
		to = $bindable(''),
		nested = false
	}: {
		legend?: string;
		/** `YYYY-MM-DD`, or '' when empty. */
		from?: string;
		/** `YYYY-MM-DD`, or '' when empty. */
		to?: string;
		/** Opens the list as a drawer stacked over the one this picker is rendered in. */
		nested?: boolean;
	} = $props();

	let mounted = $state(false);
	let open = $state(false);
	let custom = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	let hidden: HTMLInputElement | null = $state(null);
	const labelId = $props.id();

	onMount(() => (mounted = true));

	function toDate(ymd: string) {
		try {
			return ymd ? parseDate(ymd) : undefined;
		} catch {
			return undefined;
		}
	}
	const presets = [
		{
			label: 'Este mes',
			range: () => {
				const t = today('America/Argentina/Buenos_Aires');
				return [startOfMonth(t), t];
			}
		},
		{
			label: 'Mes pasado',
			range: () => {
				const prev = startOfMonth(today('America/Argentina/Buenos_Aires')).subtract({ months: 1 });
				return [prev, endOfMonth(prev)];
			}
		},
		{
			label: 'Últimos 30 días',
			range: () => {
				const t = today('America/Argentina/Buenos_Aires');
				return [t.subtract({ days: 29 }), t];
			}
		}
	];
	const range = $derived({ start: toDate(from), end: toDate(to) });
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

	function openSheet() {
		custom = false;
		open = true;
	}

	async function apply(f: string, t: string) {
		from = f;
		to = t;
		open = false;
		await tick();
		// The hidden inputs carry the new values; let ancestors (e.g. the filter bar form) see a change.
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
			bind:ref={trigger}
			onclick={openSheet}
		>
			<span class="label" id={labelId}>{legend}</span>
			<span id="{labelId}-value" class="current" class:placeholder={!summary}>
				{summary || 'Todas'}
			</span>
			<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="chev" />
		</Button>
		<!-- The Drawer is portaled out of the form, so the values submit through these inputs. -->
		<input type="hidden" name="from" value={from} disabled={!from} bind:this={hidden} />
		<input type="hidden" name="to" value={to} disabled={!to} />
	</div>
	<BottomDrawer title="Fechas (Rango)" {nested} bind:open>
		{#if custom}
			<RangeCalendar
				value={range}
				onValueChange={(v) => v.start && v.end && apply(v.start.toString(), v.end.toString())}
			/>
			<Button variant="ghost" class="mt-3 h-11 w-full" onclick={() => (custom = false)}>
				Volver
			</Button>
		{:else}
			{#each presets as preset (preset.label)}
				<Item.Root>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							onclick={() => {
								const [s, e] = preset.range();
								apply(s.toString(), e.toString());
							}}
						>
							<Item.Content><Item.Title>{preset.label}</Item.Title></Item.Content>
						</button>
					{/snippet}
				</Item.Root>
			{/each}
			<Item.Root>
				{#snippet child({ props })}
					<button {...props} type="button" onclick={() => (custom = true)}>
						<Item.Content><Item.Title>Personalizado</Item.Title></Item.Content>
						<Item.Actions
							><ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" /></Item.Actions
						>
					</button>
				{/snippet}
			</Item.Root>
		{/if}
		{#if from || to}
			<Button variant="outline" class="mt-3 h-11 w-full" onclick={() => apply('', '')}>
				Quitar fechas
			</Button>
		{/if}
	</BottomDrawer>
{:else}
	<fieldset class="native">
		<legend>{legend}</legend>
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

	.label {
		flex: none;
		font-size: var(--font-size-base);
		color: var(--text);
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
</style>
