<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
	import { replaceGoto } from '#lib/nav-stack.svelte.ts';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import { openShallow } from '#lib/open-shallow.ts';
	import Money from '#lib/components/Money.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SectionHeader from '#lib/components/SectionHeader.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import SwitchRow from '#lib/components/SwitchRow.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { CURRENCIES, type Currency } from '#lib/money.ts';
	import { KIND_OPTIONS } from '#lib/movement.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Staged in the drawer: re-seeded from the applied filters every time it opens; applied by "Ver".
	let open = $state(false);
	let archived = $state(false);
	let kind = $state('');
	let currency = $state('ARS');
	$effect(() => {
		if (!open) return;
		archived = data.filters.archived;
		kind = data.filters.kind;
		currency = data.filters.currency;
	});
	// Currency only changes which amounts a row shows, not which rows are listed.
	const count = $derived(
		data.facets.filter(
			(c) => c.match && (archived || !c.archived) && (!kind || c.kind === kind || c.kind === null)
		).length
	);
	const clear = () => {
		archived = false;
		kind = '';
		currency = 'ARS';
	};
	const apply = () => {
		open = false;
		const sp = new SvelteURLSearchParams();
		if (data.filters.q) sp.set('q', data.filters.q);
		if (kind) sp.set('kind', kind);
		if (currency !== 'ARS') sp.set('currency', currency);
		if (archived) sp.set('archived', '1');
		void replaceGoto(resolve(`/categories?${sp}` as ''), { reset: false });
	};
	const currencyOptions = [
		{ value: 'both', label: 'Ambas' },
		{ value: 'ARS', label: 'Pesos' },
		{ value: 'USD', label: 'Dólares' }
	];

	/** Currencies a row shows: the selected one, or (Ambas) each one with movements; none falls back to ARS. */
	const shown = (totals: Partial<Record<Currency, number>>): Currency[] => {
		if (data.filters.currency !== 'both') return [data.filters.currency];
		const present = CURRENCIES.filter((c) => totals[c] !== undefined);
		return present.length > 0 ? present : ['ARS'];
	};
	const kindOptions = [{ value: '', label: 'Todas' }, ...KIND_OPTIONS];
</script>

{#snippet archivedMeta()}Archivada{/snippet}
{#snippet add()}
	<Button
		href={resolve('categories/new')}
		class="h-10 gap-1 rounded-full bg-primary/12 pr-3.5 pl-2.5 font-semibold text-(--link) hover:bg-primary/20"
		onclick={(e) => openShallow(e, resolve('categories/new'), 'newCategory')}
	>
		<Plus size={18} strokeWidth={1.75} aria-hidden="true" />Agregar
	</Button>
{/snippet}
{#snippet filters()}
	<span id="kind-label" class="visually-hidden">Tipo</span>
	<SegmentedControl name="kind" options={kindOptions} bind:value={kind} labelledby="kind-label" />
	<span id="currency-label" class="visually-hidden">Moneda</span>
	<SegmentedControl
		name="currency"
		options={currencyOptions}
		bind:value={currency}
		labelledby="currency-label"
	/>
	<SwitchRow
		id="archived"
		name="archived"
		value="1"
		label="Mostrar archivadas"
		bind:checked={archived}
	/>
{/snippet}

<svelte:head>
	<title>Categorías · Gastar</title>
</svelte:head>

<PageHeader
	title="Categorías"
	back={{
		href: resolve('profile'),
		label: 'Volver al perfil',
		text: 'Perfil'
	}}
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
				href={resolve('categories/new')}
				onclick={(e) => openShallow(e, resolve('categories/new'), 'newCategory')}
				>Crear categoría</Button
			>
		</div>
	{:else}
		<FilterBar
			q={data.filters.q}
			label="Buscar categoría"
			placeholder="Buscar categoría"
			active={(data.filters.kind ? 1 : 0) +
				(data.filters.currency !== 'ARS' ? 1 : 0) +
				(data.filters.archived ? 1 : 0)}
			onfilters={() => (open = true)}
		/>

		{#if data.groups.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="search" size="1rem" /></Empty.Media>
					<Empty.Description>No hay categorías que coincidan con la búsqueda.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
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
								lead={{ icon, color: toSwatchKey(c.color) }}
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

<!-- Staged: nothing navigates until "Ver". -->
<BottomDrawer title="Filtros" bare bind:open>
	<div class="scroll">
		{@render filters()}
	</div>
	<div class="actions">
		<Button
			type="button"
			variant="outline"
			class="h-[50px] min-w-0 flex-1 basis-0 rounded-full text-[15px] font-semibold"
			onclick={clear}>Limpiar</Button
		>
		<Button
			type="button"
			class="h-[50px] min-w-0 flex-[2] basis-0 rounded-full text-[15px] font-semibold whitespace-nowrap"
			onclick={apply}>{count === 1 ? 'Ver 1 categoría' : `Ver ${count} categorías`}</Button
		>
	</div>
</BottomDrawer>

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

	/* The options scroll; the actions stay pinned below them. */
	.scroll {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-1) var(--space-4) var(--space-4);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--popover);
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
