<script lang="ts">
	import { CURRENCY_OPTIONS } from '#lib/money.ts';
	import Plus from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import { toIconKey, toSwatchKey } from '#lib/appearance.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import Icon from '#lib/components/Icon.svelte';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import ListFilterDrawer from '#lib/components/ListFilterDrawer.svelte';
	import { activeListFilters } from '#lib/list-filter.ts';
	import { ARCHIVED_LABEL } from '#lib/movement.ts';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import { openShallow } from '#lib/open-shallow.ts';
	import Money from '#lib/components/Money.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SectionHeader from '#lib/components/SectionHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let open = $state(false);
</script>

{#snippet archivedMeta()}{ARCHIVED_LABEL}{/snippet}
{#snippet add()}
	<Button
		href={resolve('accounts/new')}
		class="h-10 gap-1 rounded-full bg-primary/12 pr-3.5 pl-2.5 font-semibold text-(--link) hover:bg-primary/20"
		onclick={(e) => openShallow(e, resolve('accounts/new'), 'newAccount')}
	>
		<Plus size={18} strokeWidth={1.75} aria-hidden="true" />Agregar
	</Button>
{/snippet}

<svelte:head>
	<title>Cuentas · Gastar</title>
</svelte:head>

<PageHeader
	title="Cuentas"
	back={{ href: resolve('profile'), label: 'Volver al perfil', text: 'Perfil' }}
	action={data.hasAnyAccount ? add : undefined}
/>

<div class="page">
	{#if !data.hasAnyAccount}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="accounts" size="1rem" /></Empty.Media>
				<Empty.Description
					>Todavía no tenés cuentas. Creá la primera para empezar a registrar tus movimientos.</Empty.Description
				>
			</Empty.Header>
		</Empty.Root>
		<div class="empty-action">
			<Button
				href={resolve('accounts/new')}
				onclick={(e) => openShallow(e, resolve('accounts/new'), 'newAccount')}>Crear cuenta</Button
			>
		</div>
	{:else}
		<FilterBar
			q={data.filters.q}
			label="Buscar cuenta"
			placeholder="Buscar cuenta"
			active={activeListFilters(data.filters, '')}
			onfilters={() => (open = true)}
		/>

		{#if data.groups.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="search" size="1rem" /></Empty.Media>
					<Empty.Description>No hay cuentas que coincidan con los filtros.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			<!-- Balances are totalled per currency group, never across currencies. -->
			{#each data.groups as g (g.currency)}
				<section aria-labelledby="group-{g.currency}">
					<SectionHeader id="group-{g.currency}" title={g.label} variant="group">
						{#snippet aside()}
							<span class="group-total"
								><Money cents={g.total} currency={g.currency} tone="stock" /></span
							>
						{/snippet}
					</SectionHeader>
					<ListCard>
						{#each g.accounts as a (a.id)}
							{#snippet value()}
								<Money cents={a.balance} currency={a.currency} tone="stock" />
							{/snippet}
							<ListRow
								href={resolve(`accounts/${a.id}`)}
								onclick={(e) => openShallow(e, resolve(`accounts/${a.id}`), 'account')}
								lead={{ icon: toIconKey(a.icon), color: toSwatchKey(a.color) }}
								title={a.name}
								{value}
								meta={a.archivedAt ? archivedMeta : undefined}
								dimmed={!!a.archivedAt}
							/>
						{/each}
					</ListCard>
				</section>
			{/each}
		{/if}
	{/if}
</div>

<ListFilterDrawer
	bind:open
	path="/accounts"
	filters={data.filters}
	facets={data.facets}
	currencyDefault=""
	currencyOptions={[{ value: '', label: 'Ambas' }, ...CURRENCY_OPTIONS]}
	currencyCounts
	noun={['cuenta', 'cuentas']}
/>

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

	.group-total {
		font-family: var(--font-display);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text);
	}
</style>
