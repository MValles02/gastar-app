<script lang="ts">
	import { ACCOUNT_ICONS, type AccountIconKey, type SwatchKey } from '$lib/appearance';
	import IconBadge from './IconBadge.svelte';
	import RingPicker from './RingPicker.svelte';

	let {
		name,
		legend,
		value = $bindable(),
		color = null
	}: { name: string; legend: string; value: AccountIconKey; color?: SwatchKey | null } = $props();
</script>

<RingPicker {name} {legend} options={ACCOUNT_ICONS} bind:value>
	{#snippet swatch(key)}
		<IconBadge icon={key} {color} />
	{/snippet}
	{#snippet current(key)}
		<IconBadge icon={key} {color} size="1.5rem" />
	{/snippet}
</RingPicker>
