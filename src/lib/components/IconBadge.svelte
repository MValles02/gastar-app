<script lang="ts">
	import Icon from './Icon.svelte';
	import type { ComponentProps } from 'svelte';
	import type { SwatchKey } from '$lib/appearance';

	let {
		icon,
		color,
		size = '2.75rem',
		neutral = false
	}: {
		icon: ComponentProps<typeof Icon>['name'];
		color: SwatchKey | null;
		size?: string;
		/** Text-colored badge instead of the primary one, for non-selected navigation rows. */
		neutral?: boolean;
	} = $props();

	const tone = $derived(
		color ? `var(--swatch-${color})` : neutral ? 'var(--text)' : 'var(--primary)'
	);
</script>

<span class="badge" style:--tone={tone} style:width={size} style:height={size} aria-hidden="true">
	<Icon name={icon} size="55%" />
</span>

<style>
	.badge {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--tone) 14%, transparent);
		color: var(--tone);
	}
</style>
