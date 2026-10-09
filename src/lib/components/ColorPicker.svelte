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
		width: 2.75rem;
		height: 2.75rem;
		border-radius: var(--radius-pill);
	}
</style>
