<script lang="ts">
	import { appear } from '#lib/motion.ts';
	import { tick, type Snippet } from 'svelte';
	import { toneOf, type SwatchKey } from '#lib/appearance.ts';
	import Glyph from '#lib/components/base/Glyph.svelte';
	import type { IconName } from '#lib/components/Icon.svelte';
	import Amount from '#lib/components/base/Amount.svelte';
	import * as Item from '#lib/components/ui/item/index.js';
	import type { Currency } from '#lib/money.ts';
	import { archived } from '#lib/movement.ts';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import OptionList from './OptionList.svelte';
	import Picker from './Picker.svelte';

	type Item = {
		id: string;
		name: string;
		icon: IconName;
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
		onclosed,
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
		/** Runs once the list drawer has finished closing. */
		onclosed?: () => void;
		/** Extra last row of the list; gets a function that closes it. */
		extra?: Snippet<[() => void]>;
	} = $props();

	const mounted = hydrated();
	let open = $state(false);
	let list: ReturnType<typeof OptionList<Item>> | undefined = $state();
	let hidden: HTMLInputElement | null = $state(null);
	const labelId = $props.id();

	const visible = $derived(items.filter((item) => item.id !== excludeId));
	// An empty value is the "none" placeholder: never shows an icon, even if an item has id ''.
	const selected = $derived(value ? visible.find((item) => item.id === value) : undefined);

	/** Opens the list (a parent can ask for it, e.g. when a field is still missing). */
	export function openSheet() {
		open = true;
		void focusList();
	}

	async function focusList() {
		await tick();
		list?.focusPicked();
	}

	const meta = (item: Item) =>
		item.meta || item.archived ? archived(item.meta ?? '', !!item.archived) : undefined;
</script>

{#snippet option(item: Item)}
	<Glyph icon={item.icon} tone={toneOf(item.color)} />
	<span class="name">{item.name}</span>
	{#if item.meta || item.archived}
		<span class="meta">{meta(item)}</span>
	{/if}
{/snippet}

{#snippet current()}
	{#if selected}
		<Glyph icon={selected.icon} tone={toneOf(selected.color)} size="chip" />
		<span class="name picked">{selected.name}</span>
	{:else}
		{placeholder}
	{/if}
{/snippet}

{#snippet badge(item: Item)}
	<Glyph icon={item.icon} tone={toneOf(item.color)} />
{/snippet}

{#snippet balance(item: Item)}
	{#if item.balance !== undefined && item.currency}
		<Item.Actions class="font-semibold tabular-nums">
			<Amount cents={item.balance} currency={item.currency} />
		</Item.Actions>
	{/if}
{/snippet}

{#if visible.length === 0}
	{@render empty()}
{:else if mounted.current}
	<div class="field row">
		<Picker
			class="trigger"
			{labelId}
			label={legend}
			{title}
			value={current}
			placeholder={!selected}
			strongPlaceholder
			valueClass="flex items-center justify-end gap-3 ps-3"
			describedBy={error ? errorId : undefined}
			changeFrom={hidden}
			onopen={focusList}
			{onclosed}
			bind:open
		>
			{#snippet children(pick)}
				<OptionList
					items={visible}
					key={(item) => item.id}
					title={(item) => item.name}
					description={meta}
					value={(item) => item.id}
					on={(item) => item.id === value}
					onpick={(item) => pick(() => (value = item.id))}
					media={badge}
					end={balance}
					arrowKeys
					bind:this={list}
				/>
				{#if extra}{@render extra(() => (open = false))}{/if}
			{/snippet}
		</Picker>
		<!-- The Drawer is portaled out of the form, so the value submits through this input. -->
		<input type="hidden" {name} {value} disabled={!value} bind:this={hidden} />
		{#if error}<p class="error" id={errorId} role="alert" in:appear>{error}</p>{/if}
	</div>
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
		{#if error}<p class="error" id={errorId} role="alert" in:appear>{error}</p>{/if}
	</div>
{/if}

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

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

	/* Label left, value right (the trigger is a 56px ghost button; the card draws the border). */
	.row {
		gap: 0;
	}

	.row .error {
		padding: 0 var(--space-4) var(--space-3);
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

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.picked {
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
