<script lang="ts">
	import { resolve } from '$app/paths';
	import { toSwatchKey } from '$lib/appearance';
	import { Button } from '$lib/components/ui/button/index.js';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let archived = $derived(data.filters.archived);
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
		<FilterBar q={data.filters.q} label="Buscar categorías" placeholder="Buscar categorías">
			<Checkbox name="archived" value="1" label="Mostrar archivadas" bind:checked={archived} />
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
			<ul class="list-card">
				{#each data.categories as c (c.id)}
					<li class:archived={c.archivedAt}>
						<ListRow href={resolve(`/categories/${c.id}`)}>
							{#snippet leading()}
								<IconBadge letter={c.name[0]} color={toSwatchKey(c.color)} />
							{/snippet}
							{#snippet title()}{c.name}{/snippet}
							{#snippet subtitle()}{c.archivedAt ? 'Archivada' : ''}{/snippet}
							{#snippet trailing()}
								<span class="chev"><Icon name="chevron-right" size="1.25rem" /></span>
							{/snippet}
						</ListRow>
					</li>
				{/each}
			</ul>
		{/if}
		<ul class="list-card">
			<li>
				<ListRow href={resolve('/categories/new')}>
					{#snippet leading()}<IconBadge icon="plus" color={null} neutral />{/snippet}
					{#snippet title()}Nueva categoría{/snippet}
				</ListRow>
			</li>
		</ul>
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

	.archived :global(.title) {
		color: var(--text-muted);
	}
</style>
