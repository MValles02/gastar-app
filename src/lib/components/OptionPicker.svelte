<script lang="ts">
	import { onMount, tick, type ComponentProps, type Snippet } from 'svelte';
	import type { SwatchKey } from '$lib/appearance';
	import IconBadge from './IconBadge.svelte';
	import Sheet from './Sheet.svelte';

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
		excludeId
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
	} = $props();

	let mounted = $state(false);
	let open = $state(false);
	let trigger: HTMLButtonElement | null = $state(null);
	let list: HTMLElement | null = $state(null);
	const labelId = $props.id();

	onMount(() => (mounted = true));

	const visible = $derived(items.filter((item) => item.id !== excludeId));
	const selected = $derived(visible.find((item) => item.id === value));

	async function openSheet() {
		open = true;
		await tick();
		const target =
			list?.querySelector<HTMLInputElement>('input:checked') ??
			list?.querySelector<HTMLInputElement>('input');
		target?.focus();
	}

	async function choose(id: string) {
		value = id;
		open = false;
		await tick();
		trigger?.focus();
	}
</script>

{#snippet group()}
	<fieldset bind:this={list}>
		<legend class:visually-hidden={mounted}>{legend}</legend>
		{#each visible as item (item.id)}
			<label class="row">
				<input
					class="visually-hidden"
					type="radio"
					{name}
					value={item.id}
					bind:group={value}
					onclick={(e) => {
						if (mounted && e.detail > 0) choose(item.id);
					}}
					onkeydown={(e) => {
						if (mounted && e.key === 'Enter') {
							e.preventDefault();
							choose(item.id);
						}
					}}
				/>
				<IconBadge icon={item.icon} color={item.color} />
				<span class="name">{item.name}</span>
				{#if item.meta || item.archived}
					<span class="meta">{item.meta ?? ''}{item.archived ? ' · Archivada' : ''}</span>
				{/if}
			</label>
		{/each}
	</fieldset>
{/snippet}

{#if visible.length === 0}
	{@render empty()}
{:else if mounted}
	<div class="field">
		<span class="label" id={labelId}>{legend}</span>
		<button
			type="button"
			class="trigger"
			aria-haspopup="dialog"
			aria-labelledby="{labelId} {labelId}-value"
			aria-describedby={error ? errorId : undefined}
			bind:this={trigger}
			onclick={openSheet}
		>
			<span id="{labelId}-value" class="current" class:placeholder={!selected}>
				{#if selected}
					<IconBadge icon={selected.icon} color={selected.color} size="2rem" />
					<span class="name">{selected.name}</span>
				{:else}
					{placeholder}
				{/if}
			</span>
		</button>
		{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
	</div>
	<Sheet {title} bind:open>
		{@render group()}
	</Sheet>
{:else}
	<div class="field">
		{@render group()}
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

	.trigger {
		justify-content: flex-start;
		width: 100%;
		min-height: 3rem;
		padding: var(--space-2) var(--space-4);
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		font-weight: 400;
		text-align: left;
	}

	.trigger:hover {
		opacity: 1;
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

	.row {
		position: relative;
		flex-direction: row;
		align-items: center;
		gap: var(--space-3);
		min-height: 2.75rem;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--border);
		font-size: var(--font-size-base);
		color: var(--text);
		cursor: pointer;
	}

	.row:hover {
		background: color-mix(in srgb, var(--primary) 8%, transparent);
	}

	.row:has(input:checked) {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
		border-radius: var(--radius);
	}

	.row:has(input:focus-visible) {
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
