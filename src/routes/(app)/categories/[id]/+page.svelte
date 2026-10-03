<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { SWATCHES, toSwatchKey } from '$lib/appearance';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import { formatMoney } from '$lib/money';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const c = $derived(data.category);
	const colorLabel = $derived(SWATCHES.find((s) => s.key === c.color)?.label ?? c.color);
	const single = $derived(data.nets.length === 1 ? data.nets[0] : null);
</script>

<svelte:head>
	<title>{c.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<DetailHeader
		title={c.name}
		back={{ href: resolve('/categories'), label: 'Volver a categorías' }}
		icon="categories"
		color={toSwatchKey(c.color)}
		label={data.month.isCurrent ? 'Este mes' : 'Balance del mes'}
		context={data.month.label}
		value={single ? formatMoney(single.net, single.currency) : undefined}
		tone={single && single.net < 0 ? 'negative' : undefined}
	>
		{#if data.nets.length === 0}
			<p class="muted">Sin movimientos en este mes.</p>
		{:else if !single}
			<dl class="data">
				{#each data.nets as n (n.currency)}
					<div class="item">
						<dt>{n.currency}</dt>
						<dd class="amount">{formatMoney(n.net, n.currency)}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</DetailHeader>

	<nav class="nav" aria-label="Mes">
		<a
			class="arrow"
			href={resolve(`/categories/${c.id}?month=${data.month.prev}`)}
			aria-label="Mes anterior"
		>
			<Icon name="chevron-left" />
		</a>
		<p class="month-label">{data.month.label}</p>
		{#if data.month.isCurrent}
			<span class="arrow disabled" role="link" aria-disabled="true" aria-label="Mes siguiente">
				<Icon name="chevron-right" />
			</span>
		{:else}
			<a
				class="arrow"
				href={resolve(`/categories/${c.id}?month=${data.month.next}`)}
				aria-label="Mes siguiente"
			>
				<Icon name="chevron-right" />
			</a>
		{/if}
	</nav>

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
				triggerVariant="danger"
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

	<div class="link">
		<ListRow href={resolve(`/movements?category=${c.id}`)}>
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

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.month-label {
		font-weight: 500;
	}

	.arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: var(--radius-pill);
		color: var(--text);
		transition: background-color 0.15s ease;
	}

	.arrow.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	a.arrow:hover {
		background: color-mix(in srgb, var(--primary) 8%, transparent);
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
		overflow-wrap: anywhere;
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
</style>
