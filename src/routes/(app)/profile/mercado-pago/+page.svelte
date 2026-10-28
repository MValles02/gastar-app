<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// svelte-ignore state_referenced_locally
	let accountId = $state(data.connection?.accountId ?? '');
</script>

<svelte:head>
	<title>Mercado Pago · Gastar</title>
</svelte:head>

<PageHeader title="Mercado Pago" close={{ href: resolve('/profile'), label: 'Cerrar' }} />

<div class="page">
	{#if data.flash}<p class="flash bad" role="alert">{data.flash}</p>{/if}
	{#if data.linked}<p class="flash" role="status">Mercado Pago vinculado.</p>{/if}

	{#if !data.connection}
		<p class="lead">
			Vinculá tu cuenta de Mercado Pago para revisar tus pagos y aprobarlos como movimientos.
		</p>
		<form method="POST" action="?/connect">
			<Button type="submit" class="w-full">Vincular Mercado Pago</Button>
		</form>
	{:else if data.connection.needsReconnect}
		<p class="lead">
			Hay que volver a vincular tu cuenta de Mercado Pago para seguir importando tus pagos.
		</p>
		<form method="POST" action="?/connect">
			<Button type="submit" class="w-full">Reconectar</Button>
		</form>
	{:else}
		<p class="lead">Tu cuenta de Mercado Pago está vinculada.</p>
		<form method="POST" action="?/account" use:enhance class="field">
			<label for="accountId">Cuenta que recibe los movimientos</label>
			<NativeSelect.Root id="accountId" name="accountId" bind:value={accountId} class="w-full">
				{#if !data.connection.accountId}
					<NativeSelect.Option value="" disabled>Elegí una cuenta</NativeSelect.Option>
				{/if}
				{#each data.accounts as a (a.id)}
					<NativeSelect.Option value={a.id}>{a.name}</NativeSelect.Option>
				{/each}
			</NativeSelect.Root>
			{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
			<Button type="submit" variant="outline" class="w-full" disabled={!accountId}>Guardar</Button>
		</form>
		{#if data.connection.accountId}
			<Button href={resolve('/imports')} class="w-full">Ver movimientos</Button>
			<!-- novalidate: the server owns the range check and answers with its own message. -->
			<form method="POST" action="?/backfill" use:enhance novalidate class="field">
				<h2>Traer movimientos anteriores</h2>
				<label for="from">Desde</label>
				<input
					id="from"
					type="date"
					name="from"
					min={data.earliest}
					max={data.today}
					class="date"
				/>
				<p class="hint">
					Trae pagos y movimientos de Mercado Pago desde esa fecha. Los que ya importaste no se
					duplican.
				</p>
				{#if form?.backfillError}<p class="error" role="alert">{form.backfillError}</p>{/if}
				<Button type="submit" variant="outline" class="w-full">Traer movimientos</Button>
			</form>
		{/if}
	{/if}

	{#if data.connection}
		<ConfirmDialog
			triggerLabel="Desvincular"
			triggerClass="w-full"
			title="¿Desvincular Mercado Pago?"
			confirmLabel="Desvincular"
			action="?/disconnect"
		>
			Dejamos de importar tus pagos. Lo que ya importaste queda como está. También podés revocar el
			acceso desde tu cuenta de Mercado Pago.
		</ConfirmDialog>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.lead {
		margin: 0;
		color: var(--text-muted);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.field label {
		font-weight: 600;
	}

	.field h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.date {
		padding: var(--space-3);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		color: inherit;
		font: inherit;
	}

	.hint {
		margin: 0;
		color: var(--text-muted);
	}

	.flash {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.flash.bad,
	.error {
		color: var(--negative);
	}

	.error {
		margin: 0;
	}
</style>
