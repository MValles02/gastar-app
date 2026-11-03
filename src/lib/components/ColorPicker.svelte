<script lang="ts">
	import { SWATCHES, type SwatchKey } from '$lib/appearance';
	import RingPicker from './RingPicker.svelte';

	let {
		name,
		legend,
		value = $bindable()
	}: { name: string; legend: string; value: SwatchKey } = $props();
</script>

<!-- 8 per row; each cell is 44px tall (36px circle + padding) so the hit area stays a touch target. -->
<RingPicker
	{name}
	{legend}
	options={SWATCHES}
	bind:value
	showLabel
	gridClass="grid w-full grid-cols-8 gap-x-2 gap-y-0.5 p-1"
	cellClass="group relative flex cursor-pointer justify-center py-1"
>
	{#snippet swatch(key)}
		<span
			class="group-has-data-[state=checked]:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--sw)] group-has-focus-visible:outline-ring block aspect-square w-full max-w-9 rounded-full group-has-focus-visible:outline-2 group-has-focus-visible:outline-offset-[6px]"
			style:--sw="var(--swatch-{key})"
			style:background="var(--sw)"
		></span>
	{/snippet}
	{#snippet current(key)}
		<span class="block size-6 rounded-full" style:background="var(--swatch-{key})"></span>
	{/snippet}
</RingPicker>
