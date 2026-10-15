<script lang="ts" generics="Key extends string">
	import type { ComponentProps } from 'svelte';
	import type { SwatchKey } from '$lib/appearance';
	import Icon from './Icon.svelte';
	import IconBadge from './IconBadge.svelte';
	import RingPicker from './RingPicker.svelte';

	/** `options` is the icon set (ACCOUNT_ICONS or CATEGORY_ICONS); `placeholder` shows when `value` matches none. */
	let {
		name,
		legend,
		options,
		value = $bindable(),
		color = null,
		placeholder
	}: {
		name: string;
		legend: string;
		options: readonly { key: Key; label: string }[];
		value: Key;
		color?: SwatchKey | null;
		placeholder?: string;
	} = $props();

	const glyph = (key: Key) => key as ComponentProps<typeof Icon>['name'];
</script>

<RingPicker {name} {legend} {options} {placeholder} bind:value>
	{#snippet swatch(key)}
		<IconBadge icon={glyph(key)} {color} />
	{/snippet}
	{#snippet current(key)}
		<IconBadge icon={glyph(key)} {color} size="1.5rem" />
	{/snippet}
</RingPicker>
