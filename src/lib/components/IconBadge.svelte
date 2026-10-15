<script lang="ts">
	import Icon from './Icon.svelte';
	import type { ComponentProps } from 'svelte';
	import { swatchVar, type SwatchKey } from '$lib/appearance';

	let {
		icon,
		letter,
		color,
		size = '2.75rem',
		neutral = false
	}: {
		icon?: ComponentProps<typeof Icon>['name'];
		/** Shows this initial instead of the icon (categories). */
		letter?: string;
		color: SwatchKey | null;
		size?: string;
		/** Text-colored badge instead of the primary one, for non-selected navigation rows. */
		neutral?: boolean;
	} = $props();

	const tone = $derived(!color && neutral ? 'var(--text)' : swatchVar(color));
</script>

<span
	class="badge"
	style:--tone={tone}
	style:width={size}
	style:height={size}
	style:--badge-size={size}
	aria-hidden="true"
>
	{#if letter}<span class="letter">{letter}</span>{:else if icon}<Icon name={icon} />{/if}
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

	/* Absolute size from the badge: a percentage height inside the inline-flex box left the glyph off-center. */
	.badge :global(svg) {
		flex: none;
		width: calc(var(--badge-size) * 0.55);
		height: calc(var(--badge-size) * 0.55);
	}

	.letter {
		font-size: calc(var(--badge-size) * 0.4);
		font-weight: 600;
		line-height: 1;
		text-transform: uppercase;
	}
</style>
