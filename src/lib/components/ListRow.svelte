<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { SwatchKey } from '$lib/appearance';
	import * as Item from '$lib/components/ui/item/index.js';
	import type { StatusTone } from '$lib/status';
	import Icon from './Icon.svelte';
	import IconBadge from './IconBadge.svelte';
	import StatusPill from './StatusPill.svelte';

	/**
	 * One row of a ListCard. Line 1: title and value (top-aligned); line 2: status pill, meta, metaEnd;
	 * footer: full-width third line. A link (`href`), a submit button (`submit`) or a plain block.
	 */
	let {
		href,
		submit = false,
		lead,
		title,
		value,
		status,
		meta,
		metaEnd,
		metaLines = 1,
		footer,
		chevron = false,
		dimmed = false,
		class: className = ''
	}: {
		/** Already resolved. */
		href?: string;
		submit?: boolean;
		lead?: {
			icon?: ComponentProps<typeof Icon>['name'];
			letter?: string;
			color: SwatchKey | null;
			/** Glyph-only CSS colour. */
			glyph?: string;
		};
		title: string;
		value?: Snippet;
		status?: { tone: StatusTone; label: string };
		meta?: Snippet;
		metaEnd?: Snippet;
		/** Lines the meta may take before it is clipped; 2 wraps it and keeps the pill on the first line. */
		metaLines?: 1 | 2;
		footer?: Snippet;
		chevron?: boolean;
		dimmed?: boolean;
		class?: string;
	} = $props();
</script>

{#snippet body()}
	{#if lead}
		<Item.Media class={dimmed ? 'opacity-50' : ''}>
			<IconBadge
				icon={lead.icon}
				letter={lead.letter}
				color={lead.color}
				glyph={lead.glyph}
				size="2.25rem"
				neutral={lead.color === null}
			/>
		</Item.Media>
	{/if}
	<Item.Content class="min-w-0">
		<span class="line">
			<Item.Title class="block min-w-0 flex-1 truncate {dimmed ? 'text-(--text-muted)' : ''}"
				>{title}</Item.Title
			>
			{#if value}<span class="row-amount" class:dimmed>{@render value()}</span>{/if}
		</span>
		{#if status || meta || metaEnd}
			<Item.Description
				class="line-clamp-none flex min-w-0 gap-2 {metaLines === 2
					? 'flex-wrap items-start'
					: 'items-center'}"
			>
				{#if status}<StatusPill tone={status.tone} label={status.label} />{/if}
				{#if meta}<span class="row-meta" class:two-lines={metaLines === 2}>{@render meta()}</span
					>{/if}
				{#if metaEnd}{@render metaEnd()}{/if}
			</Item.Description>
		{/if}
	</Item.Content>
	{#if chevron}
		<Item.Actions><Icon name="chevron-right" size="1.25rem" /></Item.Actions>
	{/if}
	{#if footer}<Item.Footer>{@render footer()}</Item.Footer>{/if}
{/snippet}

<div role="listitem" class={className}>
	<Item.Root>
		{#snippet child({ props })}
			{#if href}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved href -->
				<a {href} {...props}>{@render body()}</a>
			{:else if submit}
				<button type="submit" {...props} class={[props.class, 'w-full text-left']}
					>{@render body()}</button
				>
			{:else}
				<div {...props}>{@render body()}</div>
			{/if}
		{/snippet}
	</Item.Root>
</div>

<style>
	.line {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		min-width: 0;
	}

	.row-amount {
		flex: none;
		max-width: 60%;
		text-align: end;
		font-family: var(--font-display);
		font-size: var(--font-size-base);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.dimmed {
		color: var(--text-muted);
	}

	.row-meta {
		flex: 0 1 auto;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.row-meta.two-lines {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		flex: 1 1 100%;
		white-space: normal;
	}
</style>
