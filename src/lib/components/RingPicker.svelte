<script lang="ts" generics="Key extends string">
	import { onMount, tick, type Snippet } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import BottomDrawer from './BottomDrawer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	/**
	 * Swatch picker (IconPicker, ColorPicker). With JS: a selector row (label left, current value right, `›`)
	 * that opens a bottom drawer with the radio grid. Without JS: the inline radio grid.
	 */
	let {
		name,
		legend,
		options,
		value = $bindable(),
		swatch,
		current,
		showLabel = false,
		placeholder
	}: {
		name: string;
		legend: string;
		options: readonly { key: Key; label: string }[];
		value: Key;
		swatch: Snippet<[Key]>;
		/** Compact form of the selected swatch for the row; defaults to `swatch`. */
		current?: Snippet<[Key]>;
		/** Show the selected option's label next to its swatch in the row (colors). */
		showLabel?: boolean;
		/** Text for the row when nothing is selected. */
		placeholder?: string;
	} = $props();

	let mounted = $state(false);
	let open = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	const labelId = $props.id();

	onMount(() => (mounted = true));

	const selected = $derived(options.find((o) => o.key === value));

	async function chosen() {
		open = false;
		await tick();
		trigger?.focus();
	}
</script>

{#snippet grid(groupName: string | undefined, onValueChange?: () => void)}
	<RadioGroup.Root
		name={groupName}
		bind:value
		{onValueChange}
		aria-labelledby="{labelId}-legend"
		class="flex w-auto flex-wrap gap-2 p-1"
	>
		{#each options as option (option.key)}
			<Label
				class="has-data-[state=checked]:ring-foreground has-data-[state=checked]:ring-offset-background has-focus-visible:outline-ring relative block cursor-pointer rounded-full has-data-[state=checked]:ring-2 has-data-[state=checked]:ring-offset-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-4"
			>
				<RadioGroup.Item
					value={option.key}
					aria-label={option.label}
					class="absolute inset-0 size-full rounded-full border-0 opacity-0"
				/>
				{@render swatch(option.key)}
			</Label>
		{/each}
	</RadioGroup.Root>
{/snippet}

{#if mounted}
	<Button
		variant="ghost"
		class="h-14 w-full scroll-mb-24 justify-between gap-3 rounded-none px-4"
		aria-haspopup="dialog"
		aria-labelledby="{labelId}-legend {labelId}-value"
		bind:ref={trigger}
		onclick={() => (open = true)}
	>
		<span id="{labelId}-legend" class="text-base font-normal">{legend}</span>
		<span id="{labelId}-value" class="flex min-w-0 flex-1 items-center justify-end gap-3">
			{#if selected}
				{#if current}{@render current(selected.key)}{:else}{@render swatch(selected.key)}{/if}
				{#if showLabel}<span class="font-medium">{selected.label}</span>{/if}
			{:else if placeholder}
				<span class="text-muted-foreground">{placeholder}</span>
			{/if}
		</span>
		<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="text-muted-foreground" />
	</Button>
	<!-- The Drawer is portaled out of the form, so the value submits through this input. -->
	<input type="hidden" {name} {value} />
	<BottomDrawer title={legend} bind:open>
		{@render grid(undefined, chosen)}
	</BottomDrawer>
{:else}
	<div class="flex flex-col gap-2 p-4">
		<span id="{labelId}-legend" class="text-sm leading-none font-medium select-none">{legend}</span>
		{@render grid(name)}
	</div>
{/if}
