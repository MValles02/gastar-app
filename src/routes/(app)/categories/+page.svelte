<script lang="ts">
	import { resolve } from '$app/paths';
	import { toSwatchKey } from '$lib/appearance';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import * as Item from '$lib/components/ui/item/index.js';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let archived = $derived(data.filters.archived);
	let kind = $derived<string>(data.filters.kind);
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
			active={(data.filters.kind ? 1 : 0) + (data.filters.archived ? 1 : 0)}
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

		{#if data.categories.length === 0}
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
			<Item.Group
				class="gap-0 overflow-hidden rounded-(--radius-card) border border-(--border) bg-(--surface) shadow-(--shadow-1)"
			>
				{#each data.categories as c (c.id)}
					<div role="listitem" class:archived={c.archivedAt}>
						<Item.Root>
							{#snippet child({ props })}
								<a href={resolve(`/categories/${c.id}`)} {...props}>
									<Item.Media>
										<IconBadge letter={c.name[0]} color={toSwatchKey(c.color)} />
									</Item.Media>
									<Item.Content>
										<Item.Title>{c.name}</Item.Title>
										<Item.Description>{c.archivedAt ? 'Archivada' : ''}</Item.Description>
									</Item.Content>
									<Item.Actions>
										<span class="chev"><Icon name="chevron-right" size="1.25rem" /></span>
									</Item.Actions>
								</a>
							{/snippet}
						</Item.Root>
					</div>
				{/each}
			</Item.Group>
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

	.chev {
		display: inline-flex;
		color: var(--text-muted);
	}

	/* Archived: dimmed badge and muted name; the "Archivada" subtitle keeps it from relying on colour. */
	.archived :global(.badge) {
		opacity: 0.5;
	}

	.archived :global([data-slot='item-title']) {
		color: var(--text-muted);
	}
</style>
