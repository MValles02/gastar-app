<script lang="ts">
	import { SWATCHES, type SwatchKey } from '$lib/appearance';
	import RingPicker from './RingPicker.svelte';

	let {
		name,
		legend,
		value = $bindable()
	}: { name: string; legend: string; value: SwatchKey } = $props();
</script>

<RingPicker {name} {legend} options={SWATCHES} bind:value showLabel>
	{#snippet swatch(key)}
		<span class="block size-11 rounded-full" style:background="var(--swatch-{key})"></span>
	{/snippet}
	{#snippet current(key)}
		<span class="block size-6 rounded-full" style:background="var(--swatch-{key})"></span>
	{/snippet}
</RingPicker>
