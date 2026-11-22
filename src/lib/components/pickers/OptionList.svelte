<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import * as Item from '#lib/components/ui/item/index.js';

	/** Single-choice rows in one bordered card inside a picker drawer; the picked row shows a check. */
	let {
		items,
		key,
		title,
		on,
		onpick,
		description,
		meta,
		value,
		media,
		end,
		arrowKeys = false,
		ref = $bindable(null)
	}: {
		items: T[];
		key: (item: T) => string;
		title: (item: T) => string;
		on: (item: T) => boolean;
		onpick: (item: T) => void;
		description?: (item: T) => string | undefined;
		/** Muted text at the row's end, after the check. */
		meta?: (item: T) => string | undefined;
		value?: (item: T) => string;
		media?: Snippet<[T]>;
		/** Last thing in the row. */
		end?: Snippet<[T]>;
		/** Arrow/Home/End move focus between the rows (wraps at the ends). */
		arrowKeys?: boolean;
		ref?: HTMLElement | null;
	} = $props();

	/** The row buttons, in `items` order: the one hook both arrow keys and `focusPicked` use. */
	const rowButtons = () => [...(ref?.querySelectorAll<HTMLElement>('[data-option-row]') ?? [])];

	/** Focuses the picked row, else the first one (a picker drawer calls this once it opens). */
	export function focusPicked() {
		const rows = rowButtons();
		(rows[items.findIndex(on)] ?? rows[0])?.focus();
	}

	function navigate(e: KeyboardEvent) {
		const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
		if (!keys.includes(e.key)) return;
		const rows = rowButtons();
		if (rows.length === 0) return;
		e.preventDefault();
		const i = rows.indexOf(document.activeElement as HTMLElement);
		const next =
			e.key === 'Home'
				? 0
				: e.key === 'End'
					? rows.length - 1
					: (i + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
		rows[next].focus();
	}
</script>

<div class="options" bind:this={ref}>
	{#each items as item (key(item))}
		{@const picked = on(item)}
		{@const desc = description?.(item)}
		{@const metaText = meta?.(item)}
		<Item.Root>
			{#snippet child({ props })}
				<button
					{...props}
					type="button"
					class="opt {props.class}"
					class:on={picked}
					data-option-row
					data-value={value?.(item)}
					aria-pressed={picked}
					onclick={() => onpick(item)}
					onkeydown={arrowKeys ? navigate : undefined}
				>
					{#if media}<Item.Media>{@render media(item)}</Item.Media>{/if}
					<Item.Content>
						<Item.Title>{title(item)}</Item.Title>
						{#if desc}<Item.Description>{desc}</Item.Description>{/if}
					</Item.Content>
					{#if picked}
						<Item.Actions class="check"
							><Check size={20} strokeWidth={1.75} aria-hidden="true" /></Item.Actions
						>
					{/if}
					{#if metaText}<Item.Actions class="meta tabular-nums">{metaText}</Item.Actions>{/if}
					{#if end}{@render end(item)}{/if}
				</button>
			{/snippet}
		</Item.Root>
	{/each}
</div>

<style>
	.options {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.opt {
		min-height: 58px;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-4);
		border: 0;
		border-radius: 0;
		font-size: var(--font-size-base);
	}

	.opt :global([data-slot='item-title']) {
		font-size: var(--font-size-base);
		font-weight: 400;
	}

	.opt.on :global([data-slot='item-title']) {
		font-weight: 600;
	}

	.opt :global(.check) {
		color: var(--primary);
	}

	.opt :global(.meta) {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}
</style>
