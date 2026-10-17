<script lang="ts">
	import { resolve } from '$app/paths';
	import { toIconKey, toSwatchKey } from '$lib/appearance';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import ActionLink from '$lib/components/ActionLink.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { CURRENCIES } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let archived = $derived(data.filters.archived);
	let currency = $derived<string>(data.filters.currency);
	const currencyOptions = [
		{ value: '', label: 'Ambas' },
		...CURRENCIES.map((c) => ({ value: c, label: c }))
	];
</script>

{#snippet archivedMeta()}Archivada{/snippet}

<svelte:head>
	<title>Cuentas · Gastar</title>
</svelte:head>

<PageHeader title="Cuentas" back={{ href: resolve('/profile'), label: 'Volver al perfil' }} />

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
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</div>
	{:else}
		<FilterBar
			q={data.filters.q}
			label="Buscar cuentas"
			placeholder="Buscar cuentas"
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

		<ActionLink href="/accounts/new" />

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
							<span class="group-total"><Money cents={g.total} currency={g.currency} /></span>
						{/snippet}
					</SectionHeader>
					<ListCard>
						{#each g.accounts as a (a.id)}
							{#snippet value()}
								<Money cents={a.balance} currency={a.currency} />
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

	.group-total {
		color: var(--text-muted);
	}
</style>
