<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { ACCOUNT_ICONS, SWATCHES, toIconKey, toSwatchKey } from '$lib/appearance';
	import { Button } from '$lib/components/ui/button/index.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailActions from '$lib/components/DetailActions.svelte';
	import DetailHero from '$lib/components/DetailHero.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const a = $derived(data.account);
	const iconLabel = $derived(ACCOUNT_ICONS.find((i) => i.key === a.icon)?.label ?? a.icon);
	const colorLabel = $derived(SWATCHES.find((s) => s.key === a.color)?.label ?? a.color);
	const labelId = $props.id();
</script>

<svelte:head>
	<title>{a.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader title={a.name} back={{ href: resolve('/accounts'), label: 'Volver a cuentas' }} />

	<DetailHero cents={data.balance} currency={a.currency} label="Saldo" {labelId} />

	<dl class="detail-card data">
		<div class="item">
			<dt>Moneda</dt>
			<dd>{a.currency}</dd>
		</div>
		<div class="item">
			<dt>Saldo inicial</dt>
			<dd class="amount"><Money cents={a.initialBalance} currency={a.currency} /></dd>
		</div>
		<div class="item nowrap">
			<dt>Ícono y color</dt>
			<dd class="appearance">
				<IconBadge icon={toIconKey(a.icon)} color={toSwatchKey(a.color)} size="1.5rem" />
				<span class="truncate">{iconLabel} · {colorLabel}</span>
			</dd>
		</div>
		<div class="item">
			<dt>Estado</dt>
			<dd>{a.archived ? 'Archivada' : 'Activa'}</dd>
		</div>
	</dl>

	<ListCard>
		<ListRow href={resolve(`/movements?account=${a.id}`)} title="Ver movimientos" chevron />
	</ListCard>

	{#if form?.error}
		<p class="error" role="alert"><Icon name="alert" size="1rem" />{form.error}</p>
	{/if}

	<DetailActions editHref={resolve(`/accounts/${a.id}/edit`)}>
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
					title="¿Eliminar esta cuenta?"
					confirmLabel="Eliminar"
					action="?/delete"
				>
					Esta acción no se puede deshacer.
				</ConfirmDialog>
			{/if}
		{/snippet}
	</DetailActions>
	{#if data.actions.canArchive}
		<p class="muted">
			Tiene movimientos, así que no se puede eliminar. Podés archivarla para ocultarla.
		</p>
	{/if}
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.muted {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		text-align: center;
	}

	.data {
		margin: 0;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.item:last-child {
		border-bottom: 0;
	}

	dt {
		color: var(--text-muted);
	}

	dd {
		margin: 0;
		min-width: 0;
		text-align: right;
		font-weight: 500;
	}

	.amount {
		white-space: nowrap;
		font-family: var(--font-display);
	}

	.appearance {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.nowrap {
		flex-wrap: nowrap;
	}

	.nowrap {
		gap: var(--space-2);
	}

	.nowrap dd {
		flex: 1;
	}

	.nowrap dt {
		flex: none;
	}

	.truncate {
		font-size: var(--font-size-sm);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
