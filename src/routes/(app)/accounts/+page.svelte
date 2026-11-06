<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { toIconKey, toSwatchKey } from '$lib/appearance';
	import { replaceGoto } from '$lib/nav-stack.svelte';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
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

	// Staged in the drawer: re-seeded from the applied filters every time it opens; applied by "Ver".
	let open = $state(false);
	let archived = $state(false);
	let currency = $state('');
	$effect(() => {
		if (!open) return;
		archived = data.filters.archived;
		currency = data.filters.currency;
	});
	const count = $derived(
		data.facets.filter(
			(a) => a.match && (archived || !a.archived) && (!currency || a.currency === currency)
		).length
	);
	const clear = () => {
		archived = false;
		currency = '';
	};
	const apply = () => {
		open = false;
		const sp = new SvelteURLSearchParams();
		if (data.filters.q) sp.set('q', data.filters.q);
		if (currency) sp.set('currency', currency);
		if (archived) sp.set('archived', '1');
		void replaceGoto(resolve(`/accounts?${sp}` as '/'), { keepFocus: true });
	};
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
		class="h-10 gap-1 rounded-full bg-primary/12 pr-3.5 pl-2.5 font-semibold text-(--link) hover:bg-primary/20"
		onclick={(e) => openShallow(e, resolve('/accounts/new'), 'newAccount')}
	>
		<Plus size={18} strokeWidth={1.75} aria-hidden="true" />Agregar
	</Button>
{/snippet}
{#snippet filters()}
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
	<title>Cuentas · Gastar</title>
</svelte:head>

<PageHeader
	title="Cuentas"
	back={{ href: resolve('/profile'), label: 'Volver al perfil', text: 'Perfil' }}
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
			label="Buscar cuenta"
			placeholder="Buscar cuenta"
			active={(data.filters.currency ? 1 : 0) + (data.filters.archived ? 1 : 0)}
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
			onclick={apply}>{count === 1 ? 'Ver 1 cuenta' : `Ver ${count} cuentas`}</Button
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

	.group-total {
		font-family: var(--font-display);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text);
	}
</style>
