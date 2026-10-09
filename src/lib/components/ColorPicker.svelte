<script lang="ts">
	import { SWATCHES, type SwatchKey } from '$lib/appearance';
	import RingPicker from './RingPicker.svelte';

	let {
		name,
		legend,
		value = $bindable()
	}: { name: string; legend: string; value: SwatchKey } = $props();
</script>

<RingPicker {name} {legend} options={SWATCHES} bind:value>
	{#snippet swatch(key)}
		<span class="dot" style:background="var(--swatch-{key})"></span>
	{/snippet}
</RingPicker>

<style>
	.dot {
		display: block;
		width: var(--tap-target);
		height: var(--tap-target);
		border-radius: var(--radius-pill);
	}
</style>
