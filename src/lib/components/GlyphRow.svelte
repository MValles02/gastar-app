<script lang="ts" generics="Key extends string">
	import type { ComponentProps } from 'svelte';
	import type { SwatchKey } from '#lib/appearance.ts';
	import DetailRow from './DetailRow.svelte';
	import Icon from './Icon.svelte';
	import IconBadge from './IconBadge.svelte';
	import IconColorDrawer from './IconColorDrawer.svelte';

	/**
	 * The "Ícono y color" row of a detail page: the badge (`badge`, `color`) opens the picker, staged at
	 * `icon` and `color` (green when unset); `save` stores a pick and returns its error, if any.
	 */
	let {
		icons,
		icon,
		badge,
		color,
		save
	}: {
		icons: readonly { key: Key; label: string }[];
		icon: Key;
		badge: ComponentProps<typeof Icon>['name'];
		color: SwatchKey | null;
		save: (pick: { icon: Key; color: SwatchKey }) => Promise<string | null>;
	} = $props();

	let open = $state(false);
	let error = $state('');
</script>

<DetailRow label="Ícono y color" onclick={() => (open = true)} {error}>
	<IconBadge icon={badge} {color} size="1.625rem" />
</DetailRow>

<IconColorDrawer
	bind:open
	nested={false}
	{icons}
	{icon}
	color={color ?? 'green'}
	onpick={async (pick) => (error = (await save(pick)) ?? '')}
/>
