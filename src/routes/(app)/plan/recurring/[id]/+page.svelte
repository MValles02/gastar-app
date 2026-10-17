<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailActions from '$lib/components/DetailActions.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Money from '$lib/components/Money.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const income = $derived(data.type === 'income');
	const wizardQuery = $derived(data.wizard ? `?wizard=${data.wizard}` : '');
	const currency = $derived(data.currency === 'USD' ? 'USD' : 'ARS');
</script>

<svelte:head>
	<title>{data.description} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader title={data.description} back={{ href: resolve('/plan'), label: 'Volver al plan' }} />

	<section aria-label="Monto">
		<Card.Root>
			<Card.Content>
				<div class="hero">
					<IconBadge icon={data.category.icon} color={data.category.color} size="3rem" />
					<p class="value">
						<Money
							cents={data.amount}
							{currency}
							tone="flow"
							direction={income ? 'income' : 'outcome'}
						/>
					</p>
					<p class="type">{income ? 'Ingreso fijo' : 'Pago fijo'}</p>
				</div>
			</Card.Content>
		</Card.Root>
	</section>

	<dl class="data">
		<div class="item">
			<dt>Cuenta</dt>
			<dd class="with-chip">
				<IconBadge icon={data.account.icon} color={data.account.color} size="1.5rem" />
				<span>{data.account.name}</span>
			</dd>
		</div>
		<div class="item">
			<dt>Categoría</dt>
			<dd class="with-chip">
				<IconBadge icon={data.category.icon} color={data.category.color} size="1.5rem" />
				<span>{data.category.name}</span>
			</dd>
		</div>
		<div class="item">
			<dt>Día</dt>
			<dd>{data.dayOfMonth} · todos los meses</dd>
		</div>
		<div class="item">
			<dt>Estado</dt>
			<dd>{data.inactiveReason ?? 'Activo'}</dd>
		</div>
	</dl>

	<DetailActions editHref={resolve(`/plan/recurring/${data.id}/edit${wizardQuery}`)}>
		{#snippet primary()}
			{#if data.inactiveReason}
				<p class="muted">No se puede registrar.</p>
			{:else}
				<Button class="w-full" href={resolve(`/movements/new?recurring=${data.id}`)}>
					{income ? 'Registrar ingreso' : 'Registrar pago'}
				</Button>
			{/if}
		{/snippet}
		{#snippet secondary()}
			<form method="POST" action="?/archive{wizardQuery.replace('?', '&')}" use:enhance>
				<Button type="submit" variant="outline" class="w-full">
					{data.archived ? 'Activar' : 'Desactivar'}
				</Button>
			</form>
		{/snippet}
		{#snippet destructive()}
			<ConfirmDialog
				triggerLabel="Eliminar"
				triggerVariant="destructive"
				triggerClass="w-full"
				title="¿Eliminar este movimiento fijo?"
				confirmLabel="Eliminar"
				action="?/delete{wizardQuery.replace('?', '&')}"
			>
				Los movimientos ya registrados se mantienen.
			</ConfirmDialog>
		{/snippet}
	</DetailActions>
	<p class="muted">Desactivarlo lo saca del plan sin borrar nada. Podés activarlo de nuevo.</p>
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

	.with-chip {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.muted {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		text-align: center;
	}
</style>
