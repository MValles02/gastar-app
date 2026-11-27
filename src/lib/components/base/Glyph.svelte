<script module lang="ts">
	import type { Tone } from '#lib/appearance.ts';
	import type { IconName } from '#lib/components/Icon.svelte';

	type Look = { icon: string | null; color: string | null };

	/** What a glyph shows: a category's look (null: unknown), an account's look, or a plain icon. */
	export type GlyphSpec =
		| { category: Look | null; account?: never; icon?: never; tone?: never }
		| { account: Look; category?: never; icon?: never; tone?: never }
		| { icon: IconName; tone?: Tone; category?: never; account?: never };

	export type GlyphProps = GlyphSpec & { size?: 'chip' | 'lead' | 'hero' };
</script>

<script lang="ts">
	import { accountLook, categoryLook, toneOf } from '#lib/appearance.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { es } from '#lib/copy/es.ts';

	/** The round tinted badge of a category, an account or an action. Decorative: the row's text names it. */
	let { category, account, icon, tone = 'neutral', size = 'lead' }: GlyphProps = $props();

	// A category with no look at all is unknown: amber question mark, never an initial.
	const look = $derived.by(() => {
		if (account) return { name: accountLook(account).icon, tone: toneOf(account.color) };
		if (category === null) return { name: null, tone: 'amber' as const };
		if (category) return { name: categoryLook(category).icon, tone: toneOf(category.color) };
		return { name: icon ?? null, tone };
	});
</script>

<span class="glyph" data-size={size} data-tone={look.tone} aria-hidden="true">
	{#if look.name}<Icon name={look.name} size="sm" />{:else}<span class="mark"
			>{es.ui.unknownCategory}</span
		>{/if}
</span>

<style>
	.glyph {
		--glyph: var(--size-lead);
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: var(--glyph);
		height: var(--glyph);
		border-radius: var(--radius-pill);
		color: var(--tone);
		background: color-mix(in oklab, var(--tone) var(--tint-glyph), transparent);
	}

	.glyph[data-size='chip'] {
		--glyph: var(--size-glyph-chip);
	}

	.glyph[data-size='hero'] {
		--glyph: var(--size-hero);
	}

	.glyph :global(svg) {
		flex: none;
		width: var(--icon-sm);
		height: var(--icon-sm);
	}

	.glyph[data-size='chip'] :global(svg) {
		width: var(--size-glyph-icon-chip);
		height: var(--size-glyph-icon-chip);
	}

	.glyph[data-size='hero'] :global(svg) {
		width: var(--size-glyph-icon-hero);
		height: var(--size-glyph-icon-hero);
	}

	.mark {
		font-size: calc(var(--glyph) * 0.45);
		font-weight: 600;
		line-height: 1;
	}
</style>
