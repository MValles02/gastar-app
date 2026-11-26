<script lang="ts">
	import { tick } from 'svelte';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { cn } from '#lib/utils.js';

	let {
		name,
		options,
		value = $bindable(),
		labelledby,
		onchange,
		disabled = false,
		class: className
	}: {
		name: string;
		options: { value: string; label: string; disabled?: boolean }[];
		value: string;
		labelledby?: string;
		onchange?: () => void;
		disabled?: boolean;
		/** Extra classes for each option (e.g. `flex-auto px-2 whitespace-nowrap` to size them to their text). */
		class?: string;
	} = $props();

	// The sliding thumb behind the checked option. Until it is measured (server render, before
	// hydration) the checked option paints its own background instead.
	let root = $state<HTMLElement | null>(null);
	let thumb = $state<{ x: number; w: number } | null>(null);
	let sliding = $state(false);

	function measure() {
		const i = options.findIndex((o) => o.value === value);
		const el = root?.querySelectorAll<HTMLElement>(':scope > label')[i];
		thumb = el ? { x: el.offsetLeft, w: el.offsetWidth } : null;
	}

	$effect(() => {
		void value;
		void options;
		measure();
	});

	$effect(() => {
		if (!root) return;
		const ro = new ResizeObserver(measure);
		ro.observe(root);
		// Placed without motion first; only later changes slide.
		const raf = requestAnimationFrame(() => (sliding = true));
		return () => {
			ro.disconnect();
			cancelAnimationFrame(raf);
		};
	});
</script>

<!-- Each option is 2.25rem inside a 3px track; its invisible radio's ::after overhangs 4px up and down
     (not sideways, into the next option) so the hit area is 44px tall, and min-w-11 keeps it 44px wide,
     without changing the visual layout. -->

<RadioGroup.Root
	bind:ref={root}
	{name}
	{disabled}
	bind:value
	aria-labelledby={labelledby}
	onValueChange={() => tick().then(() => onchange?.())}
	class="bg-muted relative flex w-auto max-w-full min-w-0 gap-0.5 rounded-lg p-[3px]"
>
	{#if thumb}
		<span
			class="bg-background pointer-events-none absolute top-[3px] bottom-[3px] left-0 rounded-md shadow-sm"
			class:thumb-slide={sliding}
			style:width="{thumb.w}px"
			style:transform="translateX({thumb.x}px)"
			aria-hidden="true"
		></span>
	{/if}
	{#each options as option (option.value)}
		<Label
			class={cn(
				'text-muted-foreground has-data-[state=checked]:text-foreground has-focus-visible:ring-ring/50 relative min-h-9 min-w-[44px] flex-1 basis-0 cursor-pointer justify-center rounded-md px-1 text-center [overflow-wrap:anywhere] has-focus-visible:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-50',
				!thumb && 'has-data-[state=checked]:bg-background has-data-[state=checked]:shadow-sm',
				className
			)}
		>
			<RadioGroup.Item
				value={option.value}
				disabled={option.disabled}
				class="absolute inset-0 size-full rounded-md border-0 opacity-0 after:inset-x-0 after:-inset-y-1 data-checked:bg-transparent"
			/>
			{option.label}
		</Label>
	{/each}
</RadioGroup.Root>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.thumb-slide {
			transition: transform var(--dur-base) var(--ease-drawer);
		}
	}
</style>
