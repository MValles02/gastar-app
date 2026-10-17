<script lang="ts">
	import { resolve } from '$app/paths';
	import { navigating } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Lock from '@lucide/svelte/icons/lock';
	import { Button } from '$lib/components/ui/button/index.js';
	import DateRangePicker from '$lib/components/DateRangePicker.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import MovementRow from '$lib/components/MovementRow.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let type = $derived<string>(data.filters.type);
	let account = $derived<string>(data.filters.account);
	let category = $derived<string>(data.filters.category);
	let from = $derived<string>(data.filters.from);
	let to = $derived<string>(data.filters.to);
	let currency = $derived<string>(data.lockedCurrency ?? data.filters.currency);

	const currencyOptions = [
		{ value: '', label: 'Ambas' },
		{ value: 'ARS', label: 'ARS' },
		{ value: 'USD', label: 'USD' }
	];

	const typeOptions = [
		{ value: '', label: 'Todos' },
		{ value: 'income', label: 'Ingresos' },
		{ value: 'outcome', label: 'Gastos' },
		{ value: 'transfer', label: 'Transf.' }
	];

	// Same filters, other page.
	const filterParams = () => {
		// SvelteURLSearchParams: required by the svelte/prefer-svelte-reactivity lint rule.
		const sp = new SvelteURLSearchParams();
		for (const [k, v] of Object.entries(data.filters)) if (v) sp.set(k, v);
		return sp;
	};
	const pageQuery = (page: number) => {
		const sp = filterParams();
		sp.set('page', String(page));
		return sp.toString();
	};
	const firstPageQuery = $derived(filterParams().toString());

	// The search term is not a filter: the badge and Limpiar count only the drawer filters.
	const filterCount = $derived(data.activeCount - (data.filters.q ? 1 : 0));
</script>

<svelte:head>
	<title>Movimientos · Gastar</title>
</svelte:head>

<PageHeader title="Movimientos" />

{#snippet fields(submit: () => void)}
	<span id="currency-label" class="visually-hidden">Moneda</span>
	<SegmentedControl
		name="currency"
		options={currencyOptions}
		bind:value={currency}
		labelledby="currency-label"
		disabled={data.lockedCurrency !== null}
		onchange={submit}
	/>
	{#if data.lockedCurrency !== null}
		<p class="lock">
			<Lock size={14} strokeWidth={1.75} aria-hidden="true" />Moneda de la cuenta
		</p>
	{/if}
	<span id="type-label" class="visually-hidden">Tipo</span>
	<SegmentedControl
		name="type"
		options={typeOptions}
		bind:value={type}
		labelledby="type-label"
		onchange={submit}
	/>
	<div class="group">
		<OptionPicker
			name="account"
			legend="Cuenta"
			title="Cuenta"
			items={data.accounts}
			bind:value={account}
			placeholder="Todas"
			variant="row"
		>
			{#snippet empty()}{/snippet}
		</OptionPicker>
		<OptionPicker
			name="category"
			legend="Categoría"
			title="Categoría"
			items={data.categories}
			bind:value={category}
			placeholder="Todas"
			variant="row"
		>
			{#snippet empty()}{/snippet}
		</OptionPicker>
		<DateRangePicker legend="Fechas" bind:from bind:to />
	</div>
{/snippet}

<div class="page">
	<FilterBar
		q={data.filters.q}
		label="Buscar"
		placeholder="Buscar"
		path="/movements"
		active={filterCount}
		filters={fields}
	/>

	{#if data.groups.length === 0}
		{#if data.page > 1}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="search" size="1rem" /></Empty.Media>
					<Empty.Description>Sin más movimientos.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
			<div class="empty-action">
				<Button href={resolve(`/movements?${firstPageQuery}`)} variant="outline">
					Ir a la primera página
				</Button>
			</div>
		{:else if data.activeCount === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="movements" size="1rem" /></Empty.Media>
					<Empty.Description>Sin movimientos.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
			<div class="empty-action">
				<Button href={resolve('/movements/new')}>Nuevo movimiento</Button>
			</div>
		{:else}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="search" size="1rem" /></Empty.Media>
					<Empty.Description>Sin resultados.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
			<div class="empty-action">
				<Button href={resolve('/movements')} variant="outline">Limpiar filtros</Button>
			</div>
		{/if}
	{:else}
		<div class="groups" aria-busy={navigating.to !== null}>
			{#each data.groups as g (g.day)}
				<section aria-labelledby="day-{g.day}">
					<h2 id="day-{g.day}">{g.heading}</h2>
					<ListCard>
						{#each g.items as m (m.id)}
							<MovementRow {m} />
						{/each}
					</ListCard>
				</section>
			{/each}
		</div>

		{#if data.page > 1 || data.hasNext}
			<nav class="pager" aria-label="Paginación">
				{#if data.page > 1}
					<Button href={resolve(`/movements?${pageQuery(data.page - 1)}`)} variant="outline">
						<ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />Más recientes
					</Button>
				{/if}
				{#if data.hasNext}
					<Button href={resolve(`/movements?${pageQuery(data.page + 1)}`)} variant="outline">
						Más antiguos<ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
					</Button>
				{/if}
			</nav>
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.lock {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	/* Rows of one card, like the movement form. */
	.group {
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.group > :global(* + *) {
		border-top: 1px solid var(--border);
	}

	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		transition: opacity var(--ease-fast);
	}

	.groups[aria-busy='true'] {
		opacity: 0.5;
	}

	h2 {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-muted);
		padding-inline: var(--space-4);
		margin-bottom: var(--space-2);
	}

	.empty-action {
		display: flex;
		justify-content: center;
	}

	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.pager :global(.btn) {
		min-height: 3rem;
		gap: var(--space-1);
	}

	.pager :global(.btn:only-child) {
		grid-column: 1 / 3;
	}
</style>
