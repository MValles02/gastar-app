<script lang="ts">
	import Group from '#lib/components/base/Group.svelte';
	import Row from '#lib/components/base/Row.svelte';
	import SectionLabel from '#lib/components/base/SectionLabel.svelte';
	import { CURRENCY_OPTIONS } from '#lib/money.ts';
	import Plus from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import EmptyState from '#lib/components/base/EmptyState.svelte';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import ListFilterDrawer from '#lib/components/ListFilterDrawer.svelte';
	import { activeListFilters } from '#lib/list-filter.ts';
	import { ARCHIVED_LABEL } from '#lib/movement.ts';
	import { openShallow } from '#lib/open-shallow.ts';
	import Amount from '#lib/components/base/Amount.svelte';
	import Header from '#lib/components/base/Header.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let open = $state(false);
</script>

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

<Header
	title="Cuentas"
	back={{ href: resolve('profile'), label: 'Volver al perfil' }}
	action={data.hasAnyAccount ? add : undefined}
/>

<div class="page">
	{#if !data.hasAnyAccount}
		<EmptyState
			icon="accounts"
			text="Todavía no tenés cuentas. Creá la primera para empezar a registrar tus movimientos."
		>
			{#snippet action()}
				<Button
					href={resolve('accounts/new')}
					onclick={(e) => openShallow(e, resolve('accounts/new'), 'newAccount')}
					>Crear cuenta</Button
				>
			{/snippet}
		</EmptyState>
	{:else}
		<FilterBar
			q={data.filters.q}
			label="Buscar cuenta"
			placeholder="Buscar cuenta"
			active={activeListFilters(data.filters, '')}
			onfilters={() => (open = true)}
		/>

		{#if data.groups.length === 0}
			<EmptyState icon="search" text="No hay cuentas que coincidan con los filtros." />
		{:else}
			<!-- Balances are totalled per currency group, never across currencies. -->
			{#each data.groups as g (g.currency)}
				<section aria-labelledby="group-{g.currency}">
					<SectionLabel id="group-{g.currency}" text={g.label}>
						{#snippet aside()}
							<span class="group-total"><Amount cents={g.total} currency={g.currency} /></span>
						{/snippet}
					</SectionLabel>
					<Group>
						{#each g.accounts as a (a.id)}
							{#snippet value()}
								<Amount cents={a.balance} currency={a.currency} />
							{/snippet}
							<Row
								href={resolve(`accounts/${a.id}`)}
								onclick={(e) => openShallow(e, resolve(`accounts/${a.id}`), 'account')}
								glyph={{ account: { icon: a.icon, color: a.color } }}
								title={a.name}
								trailing={value}
								status={a.archivedAt ? { tone: 'neutral', label: ARCHIVED_LABEL } : undefined}
								dimmed={!!a.archivedAt}
							/>
						{/each}
					</Group>
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
		gap: var(--space-5);
	}

	.group-total {
		font-family: var(--font-display);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text);
	}
</style>
