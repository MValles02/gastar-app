<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { SWATCHES, toSwatchKey } from '$lib/appearance';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const c = $derived(data.category);
	const colorLabel = $derived(SWATCHES.find((s) => s.key === c.color)?.label ?? c.color);
</script>

<svelte:head>
	<title>{c.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<div class="title">
		<IconBadge icon="categories" color={toSwatchKey(c.color)} />
		<div class="grow"><PageHeader title={c.name} /></div>
	</div>

	<section aria-labelledby="month-label">
		<h2 id="month-label" class="label">Este mes · {data.monthLabel}</h2>
		{#if data.nets.length === 0}
			<p class="muted">Sin movimientos este mes.</p>
		{:else}
			<dl class="data">
				{#each data.nets as n (n.currency)}
					<div class="item">
						<dt>{n.currency}</dt>
						<dd class="amount">{formatMoney(n.net, n.currency)}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</section>

	<dl class="data">
		<div class="item">
			<dt>Color</dt>
			<dd class="appearance">
				<IconBadge icon="categories" color={toSwatchKey(c.color)} size="1.75rem" />
				<span>{colorLabel}</span>
			</dd>
		</div>
		<div class="item">
			<dt>Estado</dt>
			<dd>{c.archived ? 'Archivada' : 'Activa'}</dd>
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
		<Button href={resolve(`/categories/${c.id}/edit`)}>Editar</Button>
		{#if data.actions.canDelete}
			<ConfirmDialog
				triggerLabel="Eliminar"
				title="¿Eliminar esta categoría?"
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

	<a class="back" href={resolve('/categories')}>Volver a categorías</a>
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
		font-weight: 400;
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
