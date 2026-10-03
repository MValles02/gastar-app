<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { ACCOUNT_ICONS, SWATCHES, toIconKey, toSwatchKey } from '$lib/appearance';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
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
	<DetailHeader
		title={a.name}
		back={{ href: resolve('/accounts'), label: 'Volver a cuentas' }}
		icon={toIconKey(a.icon)}
		color={toSwatchKey(a.color)}
		label="Saldo"
		value={formatMoney(data.balance, a.currency)}
		tone={data.balance < 0 ? 'negative' : undefined}
	/>

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

	<div class="link">
		<ListRow href={resolve(`/movements?account=${a.id}`)}>
			{#snippet title()}Ver movimientos{/snippet}
			{#snippet trailing()}<Icon name="chevron-right" />{/snippet}
		</ListRow>
	</div>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.muted {
		color: var(--text-muted);
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

	.link {
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-1);
	}

	.link :global(.row:last-child) {
		border-bottom: 0;
	}

	/* Destructive cue for the confirm trigger (a direct child of .actions; Archivar sits in a form). */
	.actions > :global(button.secondary) {
		color: var(--negative);
		border-color: color-mix(in srgb, var(--negative) 50%, transparent);
	}
</style>
