<script lang="ts">
	import type { Currency } from '$lib/money';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailActions from '$lib/components/DetailActions.svelte';
	import DetailCard from '$lib/components/DetailCard.svelte';
	import DetailHero from '$lib/components/DetailHero.svelte';
	import HeroAmount from '$lib/components/HeroAmount.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import MonthNav from '$lib/components/MonthNav.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Money from '$lib/components/Money.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const c = $derived(data.category);
	const kindLabel = $derived(
		c.kind === 'income' ? 'Ingreso' : c.kind === 'outcome' ? 'Gasto' : 'Ambos'
	);
	const single = $derived(data.nets.length === 1 ? data.nets[0] : null);
</script>

<!-- Net spend (outcomes - incomes) as a cash flow: spend in red, net income in green. -->
{#snippet flow(net: number, currency: Currency)}
	<Money cents={-net} {currency} tone="flow" />
{/snippet}

<svelte:head>
	<title>{c.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader
		title={c.name}
		back={{ href: resolve('/categories'), label: 'Volver a categorías' }}
	/>

	<DetailHero ariaLabel="Resumen del mes">
		{#snippet top()}
			<MonthNav
				label={data.month.label}
				prevHref={resolve(`/categories/${c.id}?month=${data.month.prev}`)}
				nextHref={data.month.isCurrent
					? null
					: resolve(`/categories/${c.id}?month=${data.month.next}`)}
			/>
		{/snippet}
		{#if single}
			<HeroAmount cents={-single.net} currency={single.currency} tone="flow" />
		{:else}
			{#if data.nets.length === 0}
				<p class="muted">Sin movimientos en este mes.</p>
			{:else}
				<dl class="duo">
					{#each data.nets as n (n.currency)}
						<div>
							<dt>{n.currency}</dt>
							<dd class="amount">{@render flow(n.net, n.currency)}</dd>
						</div>
					{/each}
				</dl>
			{/if}
		{/if}
	</DetailHero>

	<DetailCard
		rows={[
			{ label: 'Tipo', value: kindLabel },
			{ label: 'Estado', value: c.archived ? 'Archivada' : 'Activa' }
		]}
		movementsHref={resolve(`/movements?category=${c.id}`)}
	/>

	{#if form?.error}
		<p class="error" role="alert"><Icon name="alert" size="1rem" />{form.error}</p>
	{/if}

	<DetailActions editHref={resolve(`/categories/${c.id}/edit`)}>
		{#snippet secondary()}
			{#if data.actions.canArchive}
				<form method="POST" action="?/archive" use:enhance>
					<Button type="submit" variant="outline" class="w-full">Archivar</Button>
				</form>
			{/if}
			{#if data.actions.canUnarchive}
				<form method="POST" action="?/unarchive" use:enhance>
					<Button type="submit" variant="outline" class="w-full">Desarchivar</Button>
				</form>
			{/if}
		{/snippet}
		{#snippet destructive()}
			{#if data.actions.canDelete}
				<ConfirmDialog
					triggerLabel="Eliminar"
					triggerVariant="destructive"
					triggerClass="w-full"
					title="¿Eliminar esta categoría?"
					confirmLabel="Eliminar"
					action="?/delete"
				>
					Esta acción no se puede deshacer.
				</ConfirmDialog>
			{/if}
		{/snippet}
	</DetailActions>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.duo {
		align-self: stretch;
		margin: 0;
	}

	.duo div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.duo dd {
		font-family: var(--font-display);
		font-size: var(--font-size-xl);
		font-weight: 500;
	}

	.muted {
		color: var(--text-muted);
	}

	.amount {
		white-space: nowrap;
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
