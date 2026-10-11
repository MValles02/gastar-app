<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import Card from '$lib/components/Card.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Money from '$lib/components/Money.svelte';
	import { parseAmount } from '$lib/money';
	import RecurringForm from '../RecurringForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const account = $derived(data.accounts.find((a) => a.id === data.values.accountId));
	const category = $derived(data.categories.find((c) => c.id === data.values.categoryId));
	const amount = $derived(parseAmount(data.values.amount) ?? 0);
</script>

<svelte:head>
	<title>{data.values.description} · Gastar</title>
</svelte:head>

<PageHeader
	title={data.values.description}
	back={{ href: resolve('/plan'), label: 'Volver al plan' }}
	variant="compact"
/>

<div class="detail">
	<p class="amount hero-amount">
		<Money
			cents={data.values.type === 'income' ? amount : -amount}
			currency={account?.meta === 'USD' ? 'USD' : 'ARS'}
			kind={data.values.type === 'income' ? 'income' : 'outcome'}
		/>
	</p>

	<Card flush>
		<dl class="facts">
			<div class="kv">
				<dt>Cuenta</dt>
				<dd>{account?.name ?? '—'}</dd>
			</div>
			<div class="kv">
				<dt>Categoría</dt>
				<dd>{category?.name ?? '—'}</dd>
			</div>
			<div class="kv">
				<dt>Día</dt>
				<dd>{data.values.dayOfMonth} · todos los meses</dd>
			</div>
			<div class="kv">
				<dt>Estado</dt>
				<dd><span class="pill">{data.inactiveReason ?? 'Activo'}</span></dd>
			</div>
		</dl>
	</Card>

	{#if data.inactiveReason}
		<p class="inactive">No se puede registrar.</p>
	{:else}
		<Button href={resolve(`/movements/new?recurring=${data.id}`)}>Registrar pago</Button>
	{/if}

	{#key data.id}
		<RecurringForm
			initial={form?.values ?? data.values}
			errors={form?.errors}
			accounts={data.accounts}
			categories={data.categories}
			action="?/update"
			submitLabel="Guardar cambios"
			inline
		/>
	{/key}

	<div class="more">
		<form method="POST" action="?/archive" use:enhance>
			<Button type="submit" variant="outline">{data.archived ? 'Reactivar' : 'Archivar'}</Button>
		</form>
		<ConfirmDialog
			triggerLabel="Eliminar"
			triggerVariant="destructive"
			title="¿Eliminar este movimiento fijo?"
			confirmLabel="Eliminar"
			action="?/delete"
		>
			Los movimientos ya registrados se mantienen.
		</ConfirmDialog>
	</div>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.amount {
		font-family: var(--font-display);
		font-size: 2.75rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		line-height: 1.1;
		overflow-wrap: anywhere;
	}

	.facts {
		padding: 0 var(--space-4);
	}

	.kv {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3rem;
	}

	.kv + .kv {
		border-top: 1px solid var(--border);
	}

	dt {
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text-muted);
	}

	dd {
		margin: 0;
		text-align: end;
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.pill {
		display: inline-flex;
		padding: 0.125rem 0.625rem;
		border-radius: var(--radius-pill);
		background: var(--muted);
		color: var(--text-muted);
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	.inactive {
		color: var(--text-muted);
		font-weight: 500;
	}

	.more {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		padding-top: var(--space-5);
		border-top: 1px solid var(--border);
	}
</style>
