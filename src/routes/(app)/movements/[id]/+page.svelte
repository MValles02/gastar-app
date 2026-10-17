<script lang="ts">
	import { resolve } from '$app/paths';
	import { swatchVar, toCategoryIconKey, toIconKey, toSwatchKey } from '$lib/appearance';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailActions from '$lib/components/DetailActions.svelte';
	import DetailHero from '$lib/components/DetailHero.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const m = $derived(data.movement);
	const typeLabel = $derived(
		m.type === 'income' ? 'Ingreso' : m.type === 'outcome' ? 'Gasto' : 'Transferencia'
	);
	const crossCurrency = $derived(
		m.type === 'transfer' &&
			m.destinationCurrency !== null &&
			m.destinationCurrency !== m.accountCurrency
	);
</script>

<svelte:head>
	<title>{m.description} · Gastar</title>
</svelte:head>

{#snippet archivedTag(archived: boolean)}{#if archived}<span class="muted">
			· Archivada</span
		>{/if}{/snippet}

<div class="detail">
	<PageHeader
		title={m.description}
		back={{ href: resolve('/movements'), label: 'Volver a movimientos' }}
	/>

	<DetailHero
		cents={m.type === 'outcome' ? -m.amount : m.amount}
		currency={m.accountCurrency}
		tone="flow"
		direction={m.type}
		label={typeLabel}
		ariaLabel="Monto"
	/>

	<dl class="data">
		<div class="item">
			<dt>Fecha</dt>
			<dd>{m.dateLabel}</dd>
		</div>
		<div class="item">
			<dt>{m.type === 'transfer' ? 'Desde' : 'Cuenta'}</dt>
			<dd class="with-chip">
				<IconBadge
					icon={toIconKey(m.accountIcon)}
					color={toSwatchKey(m.accountColor)}
					size="1.5rem"
				/>
				<span>{m.accountName}{@render archivedTag(m.accountArchived)}</span>
			</dd>
		</div>
		{#if m.type === 'transfer'}
			<div class="item">
				<dt>Hacia</dt>
				<dd class="with-chip">
					<IconBadge
						icon={toIconKey(m.destinationIcon)}
						color={toSwatchKey(m.destinationColor)}
						size="1.5rem"
					/>
					<span>{m.destinationName}{@render archivedTag(m.destinationArchived)}</span>
				</dd>
			</div>
			{#if m.destinationAmount !== null && m.destinationCurrency}
				<div class="item">
					<dt>En destino</dt>
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
				<dd class="with-chip">
					{#if toCategoryIconKey(m.categoryIcon)}
						<IconBadge
							icon={toCategoryIconKey(m.categoryIcon) ?? undefined}
							color={toSwatchKey(m.categoryColor)}
							size="1.5rem"
						/>
					{:else}
						<span class="dot" style:--tone={swatchVar(m.categoryColor)} aria-hidden="true"></span>
					{/if}
					<span>{m.categoryName}{@render archivedTag(m.categoryArchived)}</span>
				</dd>
			</div>
		{/if}
	</dl>

	<DetailActions editHref={resolve(`/movements/${data.movement.id}/edit`)}>
		{#snippet destructive()}
			<ConfirmDialog
				triggerLabel="Eliminar"
				triggerVariant="destructive"
				triggerClass="w-full"
				title="¿Eliminar movimiento?"
				confirmLabel="Eliminar"
				action="?/delete"
			>
				No se puede deshacer.
			</ConfirmDialog>
		{/snippet}
	</DetailActions>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.data {
		margin: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
	}

	.item + .item {
		border-top: 1px solid var(--border);
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

	.muted {
		color: var(--text-muted);
	}

	.amount {
		white-space: nowrap;
	}

	.with-chip {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.dot {
		flex: none;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		background: var(--tone);
	}
</style>
