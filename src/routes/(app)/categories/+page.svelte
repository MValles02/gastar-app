<script lang="ts">
	import { resolve } from '$app/paths';
	import { toSwatchKey } from '$lib/appearance';
	import Button from '$lib/components/Button.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let archived = $derived(data.filters.archived);
</script>

<svelte:head>
	<title>Categorías · Gastar</title>
</svelte:head>

<PageHeader title="Categorías">
	{#snippet action()}
		<Button href={resolve('/categories/new')}>Nueva categoría</Button>
	{/snippet}
</PageHeader>

<div class="page">
	{#if !data.hasAnyCategory}
		<EmptyState icon="categories">
			Todavía no tenés categorías. Creá la primera para clasificar tus movimientos.
		</EmptyState>
		<div class="empty-action">
			<Button href={resolve('/categories/new')}>Crear categoría</Button>
		</div>
	{:else}
		<FilterBar q={data.filters.q} label="Buscar categorías" placeholder="Buscar categorías">
			<Checkbox name="archived" value="1" label="Mostrar archivadas" bind:checked={archived} />
		</FilterBar>

		{#if data.categories.length === 0}
			<EmptyState icon="search">No hay categorías que coincidan con la búsqueda.</EmptyState>
			<div class="empty-action">
				<a class="clear" href={resolve('/categories')}>Limpiar filtros</a>
			</div>
		{:else}
			<ul class="list">
				{#each data.categories as c (c.id)}
					<li>
						<ListRow href={resolve(`/categories/${c.id}`)}>
							{#snippet leading()}
								<IconBadge icon="categories" color={toSwatchKey(c.color)} />
							{/snippet}
							{#snippet title()}{c.name}{/snippet}
							{#snippet subtitle()}{c.archivedAt ? 'Archivada' : ''}{/snippet}
						</ListRow>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.list {
		list-style: none;
		padding: 0;
	}

	.empty-action {
		display: flex;
		justify-content: center;
	}

	.clear {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-weight: 500;
		color: var(--primary);
	}
</style>
