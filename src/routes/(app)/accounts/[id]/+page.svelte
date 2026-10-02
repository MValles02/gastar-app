<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { ACCOUNT_ICONS, SWATCHES, toIconKey, toSwatchKey } from '$lib/appearance';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const a = $derived(data.account);
	const iconLabel = $derived(ACCOUNT_ICONS.find((i) => i.key === a.icon)?.label ?? a.icon);
	const colorLabel = $derived(SWATCHES.find((s) => s.key === a.color)?.label ?? a.color);
</script>

<svelte:head>
	<title>{a.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<div class="title">
		<IconBadge icon={toIconKey(a.icon)} color={toSwatchKey(a.color)} />
		<div class="grow"><PageHeader title={a.name} /></div>
	</div>

	<section class="hero" aria-labelledby="balance-label">
		<p id="balance-label" class="label">Saldo</p>
		<p class="amount hero-amount" class:negative={data.balance < 0}>
			{formatMoney(data.balance, a.currency)}
		</p>
	</section>

	<dl class="data">
		<div class="item">
			<dt>Moneda</dt>
			<dd>{a.currency}</dd>
		</div>
		<div class="item">
			<dt>Saldo inicial</dt>
			<dd class="amount">{formatMoney(a.initialBalance, a.currency)}</dd>
		</div>
		<div class="item">
			<dt>Ícono y color</dt>
			<dd class="appearance">
				<IconBadge icon={toIconKey(a.icon)} color={toSwatchKey(a.color)} size="1.75rem" />
				<span>{iconLabel} · {colorLabel}</span>
			</dd>
		</div>
		<div class="item">
			<dt>Estado</dt>
			<dd>{a.archived ? 'Archivada' : 'Activa'}</dd>
		</div>
	</dl>

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	{#if data.actions.canArchive}
		<p class="muted">
			Tiene movimientos, así que no se puede eliminar. Podés archivarla para ocultarla.
		</p>
	{/if}

	<div class="actions">
		<Button href={resolve(`/accounts/${a.id}/edit`)}>Editar</Button>
		{#if data.actions.canDelete}
			<ConfirmDialog
				triggerLabel="Eliminar"
				title="¿Eliminar esta cuenta?"
				confirmLabel="Eliminar"
				action="?/delete"
			>
				Esta acción no se puede deshacer.
			</ConfirmDialog>
		{/if}
		{#if data.actions.canArchive}
			<form method="POST" action="?/archive" use:enhance>
				<Button type="submit" variant="secondary">Archivar</Button>
			</form>
		{/if}
		{#if data.actions.canUnarchive}
			<form method="POST" action="?/unarchive" use:enhance>
				<Button type="submit" variant="secondary">Desarchivar</Button>
			</form>
		{/if}
	</div>

	<a class="back" href={resolve('/accounts')}>Volver a cuentas</a>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.title {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.grow {
		min-width: 0;
		flex: 1;
	}

	.grow :global(h1) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.label,
	.muted {
		color: var(--text-muted);
	}

	.label {
		font-size: var(--font-size-sm);
	}

	.hero-amount {
		font-size: clamp(1.5rem, 9vw, var(--font-size-hero));
		font-weight: 500;
		line-height: 1.2;
		white-space: nowrap;
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
	}

	.amount {
		white-space: nowrap;
	}

	.appearance {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
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
