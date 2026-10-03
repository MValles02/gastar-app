<script lang="ts">
	import { resolve } from '$app/paths';
	import { toIconKey, toSwatchKey } from '$lib/appearance';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
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
	<DetailHeader
		title={m.description}
		back={{ href: resolve('/movements'), label: 'Volver a movimientos' }}
		icon={toIconKey(m.accountIcon)}
		color={toSwatchKey(m.accountColor)}
		label="Monto"
		value={heroAmount}
		tone={sign === 'neutral' ? 'transfer' : sign}
		context={typeLabel}
	/>

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
			triggerVariant="danger"
			title="¿Eliminar este movimiento?"
			confirmLabel="Eliminar"
			action="?/delete"
		>
			Esta acción no se puede deshacer.
		</ConfirmDialog>
	</div>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
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
</style>
