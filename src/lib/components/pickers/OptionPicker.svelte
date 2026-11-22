<script lang="ts">
	import { tick, type ComponentProps, type Snippet } from 'svelte';
	import type { SwatchKey } from '#lib/appearance.ts';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import IconBadge from '#lib/components/IconBadge.svelte';
	import Money from '#lib/components/Money.svelte';
	import * as Item from '#lib/components/ui/item/index.js';
	import type { Currency } from '#lib/money.ts';
	import { archived } from '#lib/movement.ts';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import OptionList from './OptionList.svelte';
	import { commitPick } from './pick.ts';
	import PickerTrigger from './PickerTrigger.svelte';

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
		/** Opens the list as a drawer stacked over the one this picker is rendered in. */
		nested?: boolean;
		/** Runs once the list drawer has finished closing. */
		onclosed?: () => void;
		/** Extra last row of the list; gets a function that closes it. */
		extra?: Snippet<[() => void]>;
	} = $props();

	const mounted = hydrated();
	let open = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	let list: ReturnType<typeof OptionList<Item>> | undefined = $state();
	let hidden: HTMLInputElement | null = $state(null);
	const labelId = $props.id();

	const visible = $derived(items.filter((item) => item.id !== excludeId));
	// An empty value is the "none" placeholder: never shows an icon, even if an item has id ''.
	const selected = $derived(value ? visible.find((item) => item.id === value) : undefined);

	/** Opens the list (a parent can ask for it, e.g. when a field is still missing). */
	export async function openSheet() {
		open = true;
		await tick();
		list?.focusPicked();
	}

	const meta = (item: Item) =>
		item.meta || item.archived ? archived(item.meta ?? '', !!item.archived) : undefined;

	const choose = (item: Item) =>
		commitPick({
			set: () => (value = item.id),
			close: () => (open = false),
			changeFrom: hidden,
			trigger
		});
</script>

{#snippet option(item: Item)}
	<IconBadge icon={item.icon} color={item.color} />
	<span class="name">{item.name}</span>
	{#if item.meta || item.archived}
		<span class="meta">{meta(item)}</span>
	{/if}
{/snippet}

{#snippet current()}
	{#if selected}
		<IconBadge icon={selected.icon} color={selected.color} size="1.625rem" />
		<span class="name picked">{selected.name}</span>
	{:else}
		{placeholder}
	{/if}
{/snippet}

{#snippet badge(item: Item)}
	<IconBadge icon={item.icon} color={item.color} size="1.875rem" />
{/snippet}

{#snippet balance(item: Item)}
	{#if item.balance !== undefined && item.currency}
		<Item.Actions class="font-semibold tabular-nums">
			<Money cents={item.balance} currency={item.currency} tone="stock" />
		</Item.Actions>
	{/if}
{/snippet}

{#if visible.length === 0}
	{@render empty()}
{:else if mounted.current}
	<div class="field row">
		<PickerTrigger
			class="trigger"
			{labelId}
			label={legend}
			value={current}
			placeholder={!selected}
			strongPlaceholder
			valueClass="flex items-center justify-end gap-3 ps-3"
			describedBy={error ? errorId : undefined}
			bind:ref={trigger}
			onclick={openSheet}
		/>
		<!-- The Drawer is portaled out of the form, so the value submits through this input. -->
		<input type="hidden" {name} {value} disabled={!value} bind:this={hidden} />
		{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
	</div>
	<BottomDrawer {title} {nested} {onclosed} bind:open>
		<OptionList
			items={visible}
			key={(item) => item.id}
			title={(item) => item.name}
			description={meta}
			value={(item) => item.id}
			on={(item) => item.id === value}
			onpick={choose}
			media={badge}
			end={balance}
			arrowKeys
			bind:this={list}
		/>
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
