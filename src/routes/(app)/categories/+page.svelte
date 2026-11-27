<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import { toneOf } from '#lib/appearance.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import ListFilterDrawer from '#lib/components/ListFilterDrawer.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import { openShallow } from '#lib/open-shallow.ts';
	import Meter from '#lib/components/base/Meter.svelte';
	import Amount from '#lib/components/base/Amount.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SectionHeader from '#lib/components/SectionHeader.svelte';
	import {
		CURRENCIES,
		CURRENCY_OPTIONS,
		DEFAULT_CURRENCY,
		type Currency,
		signTone
	} from '#lib/money.ts';
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
	/** Spend of one currency (the net when it is an outcome), for the share meter; Ambas shows none. */
	const spend = (totals: Partial<Record<Currency, number>>) =>
		data.filters.currency === 'both' ? 0 : Math.max(0, -(totals[data.filters.currency] ?? 0));
	const kindOptions = [{ value: '', label: 'Todas' }, ...KIND_OPTIONS];
</script>

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
				{@const groupSpend = g.categories.reduce((sum, c) => sum + spend(c.totals), 0)}
				<section aria-labelledby="group-{g.key}">
					<SectionHeader id="group-{g.key}" title={g.label} variant="group" />
					<ListCard>
						{#each g.categories as c (c.id)}
							{@const share = groupSpend > 0 ? spend(c.totals) / groupSpend : 0}
							{#snippet value()}
								<span class="totals">
									{#each shown(c.totals) as cur (cur)}
										{#if c.totals[cur] === undefined}
											<span class="zero"><Amount cents={0} currency={cur} /></span>
										{:else}
											<Amount cents={c.totals[cur]} currency={cur} tone={signTone(c.totals[cur])} />
										{/if}
									{/each}
								</span>
							{/snippet}
							<!-- Share of the group's month spend: only categories with spending get a bar. -->
							{#snippet meter()}
								<Meter percent={share * 100} tone={toneOf(c.color)} />
							{/snippet}
							<ListRow
								href={resolve(`categories/${c.id}`)}
								onclick={(e) => openShallow(e, resolve(`categories/${c.id}`), 'category')}
								glyph={{ category: { icon: c.icon, color: c.color } }}
								title={c.name}
								{value}
								status={c.archivedAt ? { tone: 'neutral', label: ARCHIVED_LABEL } : undefined}
								footer={share > 0 ? meter : undefined}
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
		gap: var(--space-5);
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
