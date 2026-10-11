<script lang="ts" generics="Key extends string">
	import type { Snippet } from 'svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	/** Radio group of round swatches (IconPicker, ColorPicker); the label is for screen readers only. */
	let {
		name,
		legend,
		options,
		value = $bindable(),
		swatch
	}: {
		name: string;
		legend: string;
		options: readonly { key: Key; label: string }[];
		value: Key;
		swatch: Snippet<[Key]>;
	} = $props();
</script>

<div class="flex flex-col gap-2">
	<span id="{name}-legend" class="text-muted-foreground text-sm">{legend}</span>
	<RadioGroup.Root
		{name}
		bind:value
		aria-labelledby="{name}-legend"
		class="flex w-auto flex-wrap gap-2"
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
</div>
