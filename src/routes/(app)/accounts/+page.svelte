<script lang="ts">
	import { resolve } from '$app/paths';
	import { toIconKey, toSwatchKey } from '$lib/appearance';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import { openShallow } from '$lib/open-shallow';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import SwitchRow from '$lib/components/SwitchRow.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let archived = $derived(data.filters.archived);
	let currency = $derived<string>(data.filters.currency);
	const currencyOptions = [
		{ value: '', label: 'Ambas' },
		{ value: 'ARS', label: 'Pesos' },
		{ value: 'USD', label: 'Dólares' }
	];
</script>

{#snippet archivedMeta()}Archivada{/snippet}
{#snippet add()}
	<Button
		href={resolve('/accounts/new')}
		size="sm"
		class="rounded-full"
		onclick={(e) => openShallow(e, resolve('/accounts/new'), 'newAccount')}>Agregar</Button
	>
{/snippet}

<svelte:head>
	<title>Cuentas · Gastar</title>
</svelte:head>

<PageHeader
	title="Cuentas"
	back={{ href: resolve('/profile'), label: 'Volver al perfil' }}
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
				href={resolve('/accounts/new')}
				onclick={(e) => openShallow(e, resolve('/accounts/new'), 'newAccount')}>Crear cuenta</Button
			>
		</div>
	{:else}
		<FilterBar
			q={data.filters.q}
			label="Buscar cuentas"
			placeholder="Buscar"
			path="/accounts"
			active={(data.filters.currency ? 1 : 0) + (data.filters.archived ? 1 : 0)}
		>
			{#snippet filters(submit)}
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
					<Empty.Description>No hay cuentas que coincidan con los filtros.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
			<div class="empty-action">
				<a class="clear" href={resolve('/accounts')}>Limpiar filtros</a>
			</div>
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
								href={resolve(`/accounts/${a.id}`)}
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

	.group-total {
		font-family: var(--font-display);
		font-size: var(--font-size-base);
		font-weight: 500;
	}
</style>
