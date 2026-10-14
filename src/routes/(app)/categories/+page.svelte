<script lang="ts">
	import { resolve } from '$app/paths';
	import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import * as Item from '$lib/components/ui/item/index.js';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { CURRENCIES, type Currency } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let archived = $derived(data.filters.archived);
	let kind = $derived<string>(data.filters.kind);
	let currency = $derived<string>(data.filters.currency);
	const currencyOptions = [
		...CURRENCIES.map((c) => ({ value: c, label: c })),
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

<svelte:head>
	<title>Categorías · Gastar</title>
</svelte:head>

<PageHeader title="Categorías" back={{ href: resolve('/profile'), label: 'Volver al perfil' }} />

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
			<Button href={resolve('/categories/new')}>Crear categoría</Button>
		</div>
	{:else}
		<FilterBar
			q={data.filters.q}
			label="Buscar categorías"
			placeholder="Buscar categorías"
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
				<Field.Field orientation="horizontal" class="min-h-11 w-auto">
					<Checkbox
						id="archived"
						name="archived"
						value="1"
						bind:checked={archived}
						onCheckedChange={submit}
					/>
					<Field.Label for="archived">Mostrar archivadas</Field.Label>
				</Field.Field>
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
					<div class="section-head"><h2 id="group-{g.key}">{g.label}</h2></div>
					<Item.Group
						class="gap-0 overflow-hidden rounded-(--radius-card) border border-(--border) bg-(--surface) shadow-(--shadow-1)"
					>
						{#each g.categories as c (c.id)}
							{@const icon = toCategoryIconKey(c.icon)}
							<div role="listitem" class:archived={c.archivedAt}>
								<Item.Root>
									{#snippet child({ props })}
										<a href={resolve(`/categories/${c.id}`)} {...props}>
											<Item.Media>
												<IconBadge
													icon={icon ?? undefined}
													letter={icon ? undefined : c.name[0]}
													color={toSwatchKey(c.color)}
												/>
											</Item.Media>
											<Item.Content>
												<Item.Title>{c.name}</Item.Title>
												{#if c.archivedAt}<Item.Description>Archivada</Item.Description>{/if}
											</Item.Content>
											<Item.Actions>
												<span class="row-amount">
													{#each shown(c.totals) as cur (cur)}
														{#if c.totals[cur] === undefined}
															<span class="zero"><Money cents={0} currency={cur} /></span>
														{:else}
															<Money cents={c.totals[cur]} currency={cur} kind="signed" />
														{/if}
													{/each}
												</span>
											</Item.Actions>
										</a>
									{/snippet}
								</Item.Root>
							</div>
						{/each}
					</Item.Group>
				</section>
			{/each}
		{/if}
		<Item.Group
			class="gap-0 overflow-hidden rounded-(--radius-card) border border-(--border) bg-(--surface) shadow-(--shadow-1)"
		>
			<div role="listitem">
				<Item.Root>
					{#snippet child({ props })}
						<a href={resolve('/categories/new')} {...props}>
							<Item.Media><IconBadge icon="plus" color={null} neutral /></Item.Media>
							<Item.Content><Item.Title>Nueva categoría</Item.Title></Item.Content>
						</a>
					{/snippet}
				</Item.Root>
			</div>
		</Item.Group>
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

	.section-head {
		padding-inline: var(--space-1);
	}

	h2 {
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	/* Month totals stacked on the right (ARS on top); an empty month is a muted zero. */
	.row-amount {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-family: var(--font-display);
		font-size: var(--font-size-base);
		font-weight: 500;
	}

	.zero {
		color: var(--text-muted);
	}

	/* Archived: dimmed badge and muted name; the "Archivada" subtitle keeps it from relying on colour. */
	.archived :global(.badge) {
		opacity: 0.5;
	}

	.archived :global([data-slot='item-title']),
	.archived .row-amount {
		color: var(--text-muted);
	}
</style>
