<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import { toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import ListFilterDrawer from '#lib/components/ListFilterDrawer.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import { openShallow } from '#lib/open-shallow.ts';
	import Money from '#lib/components/Money.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SectionHeader from '#lib/components/SectionHeader.svelte';
	import { CURRENCIES, CURRENCY_OPTIONS, DEFAULT_CURRENCY, type Currency } from '#lib/money.ts';
	import { ARCHIVED_LABEL, KIND_OPTIONS } from '#lib/movement.ts';
	import { activeListFilters } from '#lib/list-filter.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let open = $state(false);

	/** Currencies a row shows: the selected one, or (Ambas) each one with movements; none falls back to ARS. */
	const shown = (totals: Partial<Record<Currency, number>>): Currency[] => {
		if (data.filters.currency !== 'both') return [data.filters.currency];
		const present = CURRENCIES.filter((c) => totals[c] !== undefined);
		return present.length > 0 ? present : [DEFAULT_CURRENCY];
	};
	const kindOptions = [{ value: '', label: 'Todas' }, ...KIND_OPTIONS];
</script>

{#snippet archivedMeta()}{ARCHIVED_LABEL}{/snippet}
{#snippet add()}
	<Button
		href={resolve('categories/new')}
		class="h-10 gap-1 rounded-full bg-primary/12 pr-3.5 pl-2.5 font-semibold text-(--link) hover:bg-primary/20"
		onclick={(e) => openShallow(e, resolve('categories/new'), 'newCategory')}
	>
		<Plus size={18} strokeWidth={1.75} aria-hidden="true" />Agregar
	</Button>
{/snippet}

<svelte:head>
	<title>Categorías · Gastar</title>
</svelte:head>

<PageHeader
	title="Categorías"
	back={{ href: resolve('profile'), label: 'Volver al perfil', text: 'Perfil' }}
	action={data.hasAnyCategory ? add : undefined}
/>

<div class="page">
	{#if !data.hasAnyCategory}
		<EmptyState
			icon="categories"
			description="Todavía no tenés categorías. Creá la primera para clasificar tus movimientos."
		>
			<Button
				href={resolve('categories/new')}
				onclick={(e) => openShallow(e, resolve('categories/new'), 'newCategory')}
				>Crear categoría</Button
			>
		</EmptyState>
	{:else}
		<FilterBar
			q={data.filters.q}
			label="Buscar categoría"
			placeholder="Buscar categoría"
			active={activeListFilters(data.filters, DEFAULT_CURRENCY)}
			onfilters={() => (open = true)}
		/>

		{#if data.groups.length === 0}
			<EmptyState icon="search" description="No hay categorías que coincidan con la búsqueda." />
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
								href={resolve(`categories/${c.id}`)}
								onclick={(e) => openShallow(e, resolve(`categories/${c.id}`), 'category')}
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

<!-- Currency only changes which amounts a row shows, not which rows are listed. -->
<ListFilterDrawer
	bind:open
	path="/categories"
	filters={data.filters}
	facets={data.facets}
	currencyDefault="ARS"
	currencyOptions={[{ value: 'both', label: 'Ambas' }, ...CURRENCY_OPTIONS]}
	currencyCounts={false}
	{kindOptions}
	noun={['categoría', 'categorías']}
/>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
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
