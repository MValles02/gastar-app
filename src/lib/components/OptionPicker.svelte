<script lang="ts">
	import { onMount, tick, type ComponentProps, type Snippet } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { SwatchKey } from '$lib/appearance';
	import BottomDrawer from './BottomDrawer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import IconBadge from './IconBadge.svelte';
	import Money from './Money.svelte';
	import type { Currency } from '$lib/money';

	type Item = {
		id: string;
		name: string;
		icon: ComponentProps<typeof IconBadge>['icon'];
		color: SwatchKey | null;
		meta?: string;
		archived?: boolean;
		/** Shown at the end of the row, with `currency` (accounts in the new-movement drawer). */
		balance?: number;
		currency?: Currency;
	};

	let {
		name,
		legend,
		title,
		items,
		value = $bindable(),
		placeholder,
		empty,
		error,
		errorId,
		excludeId,
		nested = false,
		extra
	}: {
		name: string;
		legend: string;
		title: string;
		items: Item[];
		value: string;
		placeholder: string;
		empty: Snippet;
		error?: string;
		errorId?: string;
		excludeId?: string;
		/** Opens the list as a drawer stacked over the one this picker is rendered in. */
		nested?: boolean;
		/** Extra last row of the list; gets a function that closes it. */
		extra?: Snippet<[() => void]>;
	} = $props();

	let mounted = $state(false);
	let open = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	let list: HTMLElement | null = $state(null);
	let hidden: HTMLInputElement | null = $state(null);
	const labelId = $props.id();

	onMount(() => (mounted = true));

	const visible = $derived(items.filter((item) => item.id !== excludeId));
	// An empty value is the "none" placeholder: never shows an icon, even if an item has id ''.
	const selected = $derived(value ? visible.find((item) => item.id === value) : undefined);

	async function openSheet() {
		open = true;
		await tick();
		const target =
			list?.querySelector<HTMLElement>('[aria-pressed="true"]') ??
			list?.querySelector<HTMLElement>('button');
		target?.focus();
	}

	// Arrow/Home/End move focus between the rows (wraps at the ends).
	function navigate(e: KeyboardEvent) {
		const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
		if (!keys.includes(e.key) || !list) return;
		const rows = [...list.querySelectorAll<HTMLElement>('button.opt')];
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

	async function choose(id: string) {
		value = id;
		open = false;
		await tick();
		// The hidden input carries the new value; let ancestors (e.g. the filter bar form) see a change.
		hidden?.dispatchEvent(new Event('change', { bubbles: true }));
		trigger?.focus();
	}
</script>

{#snippet option(item: Item)}
	<IconBadge icon={item.icon} color={item.color} />
	<span class="name">{item.name}</span>
	{#if item.meta || item.archived}
		<span class="meta">{item.meta ?? ''}{item.archived ? ' · Archivada' : ''}</span>
	{/if}
{/snippet}

{#snippet current()}
	<span id="{labelId}-value" class="current" class:placeholder={!selected}>
		{#if selected}
			<IconBadge icon={selected.icon} color={selected.color} size="1.625rem" />
			<span class="name">{selected.name}</span>
		{:else}
			{placeholder}
		{/if}
	</span>
{/snippet}

{#if visible.length === 0}
	{@render empty()}
{:else if mounted}
	<div class="field row">
		<Button
			variant="ghost"
			class="trigger h-14 w-full scroll-mb-24 justify-between gap-3 rounded-none px-4"
			aria-haspopup="dialog"
			aria-labelledby="{labelId} {labelId}-value"
			aria-describedby={error ? errorId : undefined}
			bind:ref={trigger}
			onclick={openSheet}
		>
			<span class="label" id={labelId}>{legend}</span>
			{@render current()}
			<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="chev" />
		</Button>
		<!-- The Drawer is portaled out of the form, so the value submits through this input. -->
		<input type="hidden" {name} {value} disabled={!value} bind:this={hidden} />
		{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
	</div>
	<BottomDrawer {title} {nested} bind:open>
		<div class="options" bind:this={list}>
			{#each visible as item (item.id)}
				{@const on = item.id === value}
				<Item.Root>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="opt {props.class}"
							class:on
							data-value={item.id}
							aria-pressed={on}
							onclick={() => choose(item.id)}
							onkeydown={navigate}
						>
							<Item.Media
								><IconBadge icon={item.icon} color={item.color} size="1.875rem" /></Item.Media
							>
							<Item.Content>
								<Item.Title>{item.name}</Item.Title>
								{#if item.meta || item.archived}
									<Item.Description>
										{item.meta ?? ''}{item.archived ? ' · Archivada' : ''}
									</Item.Description>
								{/if}
							</Item.Content>
							{#if on}
								<Item.Actions class="check"
									><Check size={20} strokeWidth={1.75} aria-hidden="true" /></Item.Actions
								>
							{/if}
							{#if item.balance !== undefined && item.currency}
								<Item.Actions class="font-semibold tabular-nums">
									<Money cents={item.balance} currency={item.currency} tone="stock" />
								</Item.Actions>
							{/if}
						</button>
					{/snippet}
				</Item.Root>
			{/each}
		</div>
		{#if extra}{@render extra(() => (open = false))}{/if}
	</BottomDrawer>
{:else}
	<div class="field">
		<fieldset>
			<legend>{legend}</legend>
			{#each visible as item (item.id)}
				<label class="pre">
					<input class="visually-hidden" type="radio" {name} value={item.id} bind:group={value} />
					{@render option(item)}
				</label>
			{/each}
		</fieldset>
		{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
	</div>
{/if}

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.label,
	legend {
		padding: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	fieldset {
		border: 0;
		padding: 0;
		min-width: 0;
	}

	/* Label left, value right (trigger is a 56px ghost button; the card draws the border). */
	.row {
		gap: 0;
	}

	.row .label {
		flex: none;
		font-size: var(--font-size-base);
		color: var(--text);
	}

	.row .current {
		flex: 1;
		padding-inline-start: var(--space-3);
		justify-content: flex-end;
	}

	.row .error {
		padding: 0 var(--space-4) var(--space-3);
	}

	.row :global(.chev) {
		flex: none;
		color: var(--text-muted);
	}

	.current {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
	}

	.placeholder {
		color: var(--text-muted);
	}

	.pre {
		position: relative;
		flex-direction: row;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--tap-target);
		padding: var(--space-2) 0;
		font-size: var(--font-size-base);
		color: var(--text);
		cursor: pointer;
	}

	.pre:has(input:checked) {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
		border-radius: var(--radius);
	}

	.pre:has(input:focus-visible) {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	/* The options share one bordered card (14px), rows split by nothing but their height. */
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

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.current .name {
		flex: 0 1 auto;
	}

	.meta {
		flex: none;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
