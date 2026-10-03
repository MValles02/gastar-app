<script lang="ts">
	import { resolve } from '$app/paths';
	import { toIconKey, toSwatchKey } from '$lib/appearance';
	import Button from '$lib/components/Button.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { formatMoney } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let currency = $derived<string>(data.filters.currency);
	let archived = $derived(data.filters.archived);

	const options = [
		{ value: '', label: 'Todas' },
		{ value: 'ARS', label: 'ARS' },
		{ value: 'USD', label: 'USD' }
	];
</script>

<svelte:head>
	<title>Cuentas · Gastar</title>
</svelte:head>

<PageHeader title="Cuentas">
	{#snippet action()}
		<Button href={resolve('/accounts/new')}>Nueva cuenta</Button>
	{/snippet}
</PageHeader>

<div class="page">
	{#if !data.hasAnyAccount}
		<EmptyState icon="accounts">
			Todavía no tenés cuentas. Creá la primera para empezar a registrar tus movimientos.
		</EmptyState>
		<div class="empty-action">
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</div>
	{:else}
		<FilterBar q={data.filters.q} label="Buscar cuentas" placeholder="Buscar cuentas">
			<SegmentedControl name="currency" {options} bind:value={currency} />
			<Checkbox name="archived" value="1" label="Mostrar archivadas" bind:checked={archived} />
		</FilterBar>

		{#if data.accounts.length === 0}
			<EmptyState icon="search">No hay cuentas que coincidan con los filtros.</EmptyState>
			<div class="empty-action">
				<a class="clear" href={resolve('/accounts')}>Limpiar filtros</a>
			</div>
		{:else}
			<ul class="list-card">
				{#each data.accounts as a (a.id)}
					<li>
						<ListRow href={resolve(`/accounts/${a.id}`)}>
							{#snippet leading()}
								<IconBadge icon={toIconKey(a.icon)} color={toSwatchKey(a.color)} />
							{/snippet}
							{#snippet title()}{a.name}{/snippet}
							{#snippet subtitle()}{a.currency}{a.archivedAt ? ' · Archivada' : ''}{/snippet}
							{#snippet trailing()}
								<span class="amount" class:negative={a.balance < 0}>
									{formatMoney(a.balance, a.currency)}
								</span>
							{/snippet}
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

	.empty-action {
		display: flex;
		justify-content: center;
	}

	.clear {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-weight: 500;
		color: var(--text);
		text-decoration: underline;
	}

	.amount {
		white-space: nowrap;
		font-weight: 500;
	}

	.negative {
		color: var(--negative);
	}
</style>
