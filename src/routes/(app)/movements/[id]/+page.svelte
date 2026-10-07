<script lang="ts">
	import { resolve } from '$app/paths';
	import { toIconKey, toSwatchKey } from '$lib/appearance';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import Money from '$lib/components/Money.svelte';
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
		variant="compact"
	/>

	<section aria-label="Monto">
		<Card>
			<div class="hero">
				<IconBadge
					icon={toIconKey(m.accountIcon)}
					color={toSwatchKey(m.accountColor)}
					size="3rem"
				/>
				<p class="value">
					<Money
						cents={m.type === 'outcome' ? -m.amount : m.amount}
						currency={m.accountCurrency}
						kind={m.type}
					/>
				</p>
				<p class="type">{typeLabel}</p>
			</div>
		</Card>
	</section>

	<dl class="data">
		<div class="item">
			<dt>Fecha</dt>
			<dd>{m.dateLabel}</dd>
		</div>
		<div class="item">
			<dt>{m.type === 'transfer' ? 'Desde' : 'Cuenta'}</dt>
			<dd>{m.accountName}{@render archivedTag(m.accountArchived)}</dd>
		</div>
		{#if m.type === 'transfer'}
			<div class="item">
				<dt>Hacia</dt>
				<dd>{m.destinationName}{@render archivedTag(m.destinationArchived)}</dd>
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
				<dd>{m.categoryName}{@render archivedTag(m.categoryArchived)}</dd>
			</div>
		{/if}
	</dl>

	<div class="actions">
		<Button href={resolve(`/movements/${data.movement.id}/edit`)} block>Editar</Button>
		<ConfirmDialog
			triggerLabel="Eliminar"
			triggerVariant="danger"
			title="¿Eliminar movimiento?"
			confirmLabel="Eliminar"
			action="?/delete"
		>
			No se puede deshacer.
		</ConfirmDialog>
	</div>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-3) 0;
		text-align: center;
	}

	.value {
		margin-top: var(--space-3);
		font-family: var(--font-display);
		font-size: clamp(2rem, 11vw, 2.75rem);
		font-weight: 500;
		line-height: 1.1;
		overflow-wrap: anywhere;
	}

	.type {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
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

	/* ConfirmDialog renders its own trigger button: stack both full width. */
	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.actions > :global(.btn) {
		width: 100%;
	}
</style>
