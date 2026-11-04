<script lang="ts">
	import { resolve } from '$app/paths';
	import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import { openShallow } from '$lib/open-shallow';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import SwitchRow from '$lib/components/SwitchRow.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { CURRENCIES, type Currency } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let archived = $derived(data.filters.archived);
	let kind = $derived<string>(data.filters.kind);
	let currency = $derived<string>(data.filters.currency);
	const currencyOptions = [
		{ value: 'ARS', label: 'Pesos' },
		{ value: 'USD', label: 'Dólares' },
		{ value: 'both', label: 'Ambas' }
	];

	/** Currencies a row shows: the selected one, or (Ambas) each one with movements; none falls back to ARS. */
	const shown = (totals: Partial<Record<Currency, number>>): Currency[] => {
		if (data.filters.currency !== 'both') return [data.filters.currency];
		const present = CURRENCIES.filter((c) => totals[c] !== undefined);
		return present.length > 0 ? present : ['ARS'];
	};
	const kindOptions = [
		{ value: '', label: 'Todas' },
		{ value: 'outcome', label: 'Gastos' },
		{ value: 'income', label: 'Ingresos' }
	];
</script>

{#snippet archivedMeta()}Archivada{/snippet}
{#snippet add()}
	<Button
		href={resolve('/categories/new')}
		size="sm"
		class="rounded-full"
		onclick={(e) => openShallow(e, resolve('/categories/new'), 'newCategory')}>Agregar</Button
	>
{/snippet}

<svelte:head>
	<title>Categorías · Gastar</title>
</svelte:head>

<PageHeader
	title="Categorías"
	back={{ href: resolve('/profile'), label: 'Volver al perfil' }}
	action={data.hasAnyCategory ? add : undefined}
/>

<div class="page">
	{#if !data.hasAnyCategory}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="categories" size="1rem" /></Empty.Media>
				<Empty.Description
					>Todavía no tenés categorías. Creá la primera para clasificar tus movimientos.</Empty.Description
				>
			</Empty.Header>
		</Empty.Root>
		<div class="empty-action">
			<Button
				href={resolve('/categories/new')}
				onclick={(e) => openShallow(e, resolve('/categories/new'), 'newCategory')}
				>Crear categoría</Button
			>
		</div>
	{:else}
		<FilterBar
			q={data.filters.q}
			label="Buscar categorías"
			placeholder="Buscar"
			path="/categories"
			active={(data.filters.kind ? 1 : 0) +
				(data.filters.currency !== 'ARS' ? 1 : 0) +
				(data.filters.archived ? 1 : 0)}
		>
			{#snippet filters(submit)}
				<span id="kind-label" class="visually-hidden">Tipo</span>
				<SegmentedControl
					name="kind"
					options={kindOptions}
					bind:value={kind}
					labelledby="kind-label"
					onchange={submit}
				/>
				<span id="currency-label" class="visually-hidden">Moneda</span>
				<SegmentedControl
					name="currency"
					options={currencyOptions}
					bind:value={currency}
					labelledby="currency-label"
					onchange={submit}
				/>
				<SwitchRow
					id="archived"
					name="archived"
					value="1"
					label="Mostrar archivadas"
					bind:checked={
						() => archived,
						(v) => {
							archived = v;
							submit();
						}
					}
				/>
			{/snippet}
		</FilterBar>

		{#if data.groups.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="search" size="1rem" /></Empty.Media>
					<Empty.Description>No hay categorías que coincidan con la búsqueda.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
			<div class="empty-action">
				<a class="clear" href={resolve('/categories')}>Limpiar filtros</a>
			</div>
		{:else}
			{#each data.groups as g (g.key)}
				<section aria-labelledby="group-{g.key}">
					<SectionHeader id="group-{g.key}" title={g.label} variant="group" />
					<ListCard>
						{#each g.categories as c (c.id)}
							{@const icon = toCategoryIconKey(c.icon) ?? ('categories' as const)}
							{#snippet value()}
								<span class="totals">
									{#each shown(c.totals) as cur (cur)}
										{#if c.totals[cur] === undefined}
											<span class="zero"><Money cents={0} currency={cur} /></span>
										{:else}
											<Money cents={c.totals[cur]} currency={cur} tone="flow" />
										{/if}
									{/each}
								</span>
							{/snippet}
							<ListRow
								href={resolve(`/categories/${c.id}`)}
								lead={{
									icon,
									color: toSwatchKey(c.color)
								}}
								title={c.name}
								{value}
								meta={c.archivedAt ? archivedMeta : undefined}
								dimmed={!!c.archivedAt}
							/>
						{/each}
					</ListCard>
				</section>
			{/each}
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.empty-action {
		display: flex;
		justify-content: center;
	}

	.clear {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		font-weight: 500;
		color: var(--text);
		text-decoration: underline;
	}

	/* Month totals stacked on the right (ARS on top); an empty month is a muted zero. */
	.totals {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.zero {
		color: var(--text-muted);
	}
</style>
