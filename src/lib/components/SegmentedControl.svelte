<script lang="ts">
	import { tick } from 'svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { cn } from '$lib/utils.js';

	let {
		name,
		options,
		value = $bindable(),
		labelledby,
		onchange,
		disabled = false,
		size = 'default'
	}: {
		name: string;
		options: { value: string; label: string }[];
		value: string;
		labelledby?: string;
		onchange?: () => void;
		disabled?: boolean;
		size?: 'default' | 'compact';
	} = $props();
</script>

<RadioGroup.Root
	{name}
	{disabled}
	bind:value
	aria-labelledby={labelledby}
	onValueChange={() => tick().then(() => onchange?.())}
	class="bg-muted flex w-auto max-w-full min-w-0 gap-0.5 rounded-lg p-[3px]"
>
	{#each options as option (option.value)}
		<Label
			class={cn(
				'text-muted-foreground has-data-[state=checked]:bg-background has-data-[state=checked]:text-foreground has-focus-visible:ring-ring/50 relative min-h-9 min-w-0 flex-1 basis-0 cursor-pointer justify-center rounded-md px-1 text-center [overflow-wrap:anywhere] has-data-[state=checked]:shadow-sm has-focus-visible:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-50',
				size === 'compact' && 'flex-auto px-2 whitespace-nowrap'
			)}
		>
			<RadioGroup.Item
				value={option.value}
				class="absolute inset-0 size-full rounded-md border-0 opacity-0 data-checked:bg-transparent"
			/>
			{option.label}
		</Label>
	{/each}
</RadioGroup.Root>
