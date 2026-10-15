<script lang="ts">
	import { onMount, tick, type ComponentProps, type Snippet } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { SwatchKey } from '$lib/appearance';
	import BottomDrawer from './BottomDrawer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import IconBadge from './IconBadge.svelte';

	type Item = {
		id: string;
		name: string;
		icon: ComponentProps<typeof IconBadge>['icon'];
		color: SwatchKey | null;
		meta?: string;
		archived?: boolean;
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
		variant = 'field'
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
		/** `row`: a full-width list row (label left, value right) for grouped cards. */
		variant?: 'field' | 'row';
	} = $props();

	let mounted = $state(false);
	let open = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	let list: HTMLElement | null = $state(null);
	let hidden: HTMLInputElement | null = $state(null);
	const labelId = $props.id();

	onMount(() => (mounted = true));

	const isRow = $derived(variant === 'row');
	const visible = $derived(items.filter((item) => item.id !== excludeId));
	const selected = $derived(visible.find((item) => item.id === value));

	async function openSheet() {
		open = true;
		await tick();
		const target =
			list?.querySelector<HTMLElement>('[aria-pressed="true"]') ??
			list?.querySelector<HTMLElement>('button');
		target?.focus();
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

{#snippet label()}
	<span class="label" id={labelId}>{legend}</span>
{/snippet}

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
			<IconBadge icon={selected.icon} color={selected.color} size={isRow ? '1.5rem' : '2rem'} />
			<span class="name">{selected.name}</span>
		{:else}
			{placeholder}
		{/if}
	</span>
{/snippet}

{#if visible.length === 0}
	{@render empty()}
{:else if mounted}
	<div class="field" class:row={isRow}>
		<!-- The row variant puts the label inside the trigger, the field variant above it. -->
		{#if !isRow}{@render label()}{/if}
		<Button
			variant={isRow ? 'ghost' : 'outline'}
			class={isRow
				? 'trigger h-14 w-full scroll-mb-24 justify-between gap-3 rounded-none px-4'
				: 'trigger w-full justify-start'}
			aria-haspopup="dialog"
			aria-labelledby="{labelId} {labelId}-value"
			aria-describedby={error ? errorId : undefined}
			bind:ref={trigger}
			onclick={openSheet}
		>
			{#if isRow}{@render label()}{/if}
			{@render current()}
			{#if isRow}<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="chev" />{/if}
		</Button>
		<!-- The Drawer is portaled out of the form, so the value submits through this input. -->
		<input type="hidden" {name} {value} disabled={!value} bind:this={hidden} />
		{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
	</div>
	<BottomDrawer {title} bind:open>
		<div class="options" bind:this={list}>
			{#each visible as item (item.id)}
				<Item.Root>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="opt {props.class}"
							data-value={item.id}
							aria-pressed={item.id === value}
							onclick={() => choose(item.id)}
						>
							<Item.Media><IconBadge icon={item.icon} color={item.color} /></Item.Media>
							<Item.Content>
								<Item.Title>{item.name}</Item.Title>
								{#if item.meta || item.archived}
									<Item.Description>
										{item.meta ?? ''}{item.archived ? ' · Archivada' : ''}
									</Item.Description>
								{/if}
							</Item.Content>
							{#if item.id === value}
								<Item.Actions
									><Check size={20} strokeWidth={1.75} aria-hidden="true" /></Item.Actions
								>
							{/if}
						</button>
					{/snippet}
				</Item.Root>
			{/each}
		</div>
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

	/* Row variant: label left, value right (trigger is a 56px ghost button; the card draws the border). */
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
		border-bottom: 1px solid var(--border);
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

	.options {
		display: flex;
		flex-direction: column;
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
