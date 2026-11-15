<script lang="ts">
	import Icon from './Icon.svelte';
	import type { ComponentProps } from 'svelte';
	import { swatchVar, type SwatchKey } from '#lib/appearance.ts';

	let {
		icon,
		letter,
		color,
		size = '2.75rem',
		neutral = false,
		glyph
	}: {
		icon?: ComponentProps<typeof Icon>['name'];
		/** Shows this initial instead of the icon (categories). */
		letter?: string;
		color: SwatchKey | null;
		size?: string;
		/** Text-colored badge instead of the primary one, for non-selected navigation rows. */
		neutral?: boolean;
		/** CSS colour for the glyph only; the tile stays neutral. */
		glyph?: string;
	} = $props();

	const tone = $derived(!color && neutral ? 'var(--text)' : swatchVar(color));
</script>

<span
	class="badge"
	style:--tone={tone}
	style:width={size}
	style:height={size}
	style:--badge-size={size}
	style:color={glyph}
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
		/* Rounded square (canvas): 10px at every size. */
		border-radius: 10px;
		background: color-mix(in srgb, var(--tone) 14%, transparent);
		color: var(--tone);
	}

	/* Glyph at half the tile (36px tile, 18px glyph); absolute so it stays centred in the inline-flex box. */
	.badge :global(svg) {
		flex: none;
		width: calc(var(--badge-size) * 0.5);
		height: calc(var(--badge-size) * 0.5);
	}

	.letter {
		font-size: calc(var(--badge-size) * 0.4);
		font-weight: 600;
		line-height: 1;
		text-transform: uppercase;
	}
</style>
