<script lang="ts">
	import { resolve } from '$app/paths';
	import { toIconKey, toSwatchKey } from '$lib/appearance';
	import { Button } from '$lib/components/ui/button/index.js';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import * as Item from '$lib/components/ui/item/index.js';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
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
		<FilterBar q={data.filters.q} label="Buscar cuentas" placeholder="Buscar cuentas">
			<span id="currency-label" class="visually-hidden">Moneda</span>
			<SegmentedControl
				name="currency"
				options={currencyOptions}
				bind:value={currency}
				labelledby="currency-label"
			/>
			<Checkbox name="archived" value="1" label="Mostrar archivadas" bind:checked={archived} />
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
					<div class="section-head">
						<h2 id="group-{g.currency}">{g.label}</h2>
						<span class="group-total"><Money cents={g.total} currency={g.currency} /></span>
					</div>
					<ul class="list-card">
						{#each g.accounts as a (a.id)}
							<li class:archived={a.archivedAt}>
								<Item.Root>
									{#snippet child({ props })}
										<a href={resolve(`/accounts/${a.id}`)} {...props}>
											<Item.Media>
												<IconBadge icon={toIconKey(a.icon)} color={toSwatchKey(a.color)} />
											</Item.Media>
											<Item.Content>
												<Item.Title>{a.name}</Item.Title>
												<Item.Description>
													{a.currency}{a.archivedAt ? ' · Archivada' : ''}
												</Item.Description>
											</Item.Content>
											<Item.Actions>
												<span class="row-amount">
													<Money cents={a.balance} currency={a.currency} />
												</span>
											</Item.Actions>
										</a>
									{/snippet}
								</Item.Root>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		{/if}
		<ul class="list-card">
			<li>
				<Item.Root>
					{#snippet child({ props })}
						<a href={resolve('/accounts/new')} {...props}>
							<Item.Media><IconBadge icon="plus" color={null} neutral /></Item.Media>
							<Item.Content><Item.Title>Nueva cuenta</Item.Title></Item.Content>
						</a>
					{/snippet}
				</Item.Root>
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

	.group-total,
	.row-amount {
		font-family: var(--font-display);
		font-size: var(--font-size-base);
		font-weight: 500;
	}

	.group-total {
		color: var(--text-muted);
	}

	/* Archived: dimmed badge and muted text; the "Archivada" subtitle keeps it from relying on colour. */
	.archived :global(.badge) {
		opacity: 0.5;
	}

	.archived :global([data-slot='item-title']),
	.archived .row-amount {
		color: var(--text-muted);
	}
</style>
