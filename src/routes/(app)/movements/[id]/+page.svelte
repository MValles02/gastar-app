<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const m = $derived(data.movement);
	const typeLabel = $derived(
		m.type === 'income' ? 'Ingreso' : m.type === 'outcome' ? 'Gasto' : 'Transferencia'
	);
	const sign = $derived(
		m.type === 'income' ? 'positive' : m.type === 'outcome' ? 'negative' : 'neutral'
	);
	const heroAmount = $derived(
		formatMoney(m.type === 'outcome' ? -m.amount : m.amount, m.accountCurrency, {
			sign: m.type === 'income' ? 'always' : 'auto'
		})
	);
	const crossCurrency = $derived(
		m.type === 'transfer' &&
			m.destinationCurrency !== null &&
			m.destinationCurrency !== m.accountCurrency
	);
	const archivedSuffix = (archived: boolean) => (archived ? ' · Archivada' : '');
</script>

<svelte:head>
	<title>{m.description} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader title={m.description} />

	<section class="hero" aria-labelledby="amount-label">
		<p id="amount-label" class="label">Monto</p>
		<p class="amount hero-amount {sign === 'neutral' ? '' : sign}">{heroAmount}</p>
	</section>

	<dl class="data">
		<div class="item">
			<dt>Tipo</dt>
			<dd>{typeLabel}</dd>
		</div>
		<div class="item">
			<dt>Fecha</dt>
			<dd>{m.dateLabel}</dd>
		</div>
		<div class="item">
			<dt>Descripción</dt>
			<dd>{m.description}</dd>
		</div>
		<div class="item">
			<dt>{m.type === 'transfer' ? 'Cuenta de origen' : 'Cuenta'}</dt>
			<dd>{m.accountName}{archivedSuffix(m.accountArchived)}</dd>
		</div>
		{#if m.type === 'transfer'}
			<div class="item">
				<dt>Cuenta de destino</dt>
				<dd>{m.destinationName}{archivedSuffix(m.destinationArchived)}</dd>
			</div>
			{#if m.destinationAmount !== null && m.destinationCurrency}
				<div class="item">
					<dt>Monto en destino</dt>
					<dd class="amount">{formatMoney(m.destinationAmount, m.destinationCurrency)}</dd>
				</div>
			{/if}
			{#if crossCurrency && m.exchangeRate !== null}
				<div class="item">
					<dt>Cotización</dt>
					<dd class="amount">1 USD = {formatMoney(m.exchangeRate, 'ARS')}</dd>
				</div>
			{/if}
		{:else}
			<div class="item">
				<dt>Categoría</dt>
				<dd>{m.categoryName}{archivedSuffix(m.categoryArchived)}</dd>
			</div>
		{/if}
	</dl>

	<div class="actions">
		<Button href={resolve(`/movements/${data.movement.id}/edit`)}>Editar</Button>
		<ConfirmDialog
			triggerLabel="Eliminar"
			title="¿Eliminar este movimiento?"
			confirmLabel="Eliminar"
			action="?/delete"
		>
			Esta acción no se puede deshacer.
		</ConfirmDialog>
	</div>

	<a class="back" href={resolve('/movements')}>Volver a movimientos</a>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.label {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hero-amount {
		font-size: clamp(1.5rem, 9vw, var(--font-size-hero));
		font-weight: 500;
		line-height: 1.2;
		white-space: nowrap;
	}

	.positive {
		color: var(--positive);
	}

	.negative {
		color: var(--negative);
	}

	.data {
		margin: 0;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 2.75rem;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--border);
	}

	dt {
		color: var(--text-muted);
	}

	dd {
		margin: 0;
		min-width: 0;
		text-align: right;
		overflow-wrap: anywhere;
	}

	.amount {
		white-space: nowrap;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.back {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-weight: 500;
		color: var(--primary);
	}
</style>
