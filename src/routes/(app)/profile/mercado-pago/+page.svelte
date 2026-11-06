<script lang="ts">
	import { resolve } from '$app/paths';
	import { autosave, submitAction } from '$lib/autosave';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { refreshAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// A save sets the value at once; a reload (Deshacer) brings the stored one back in.
	let accountId = $derived(data.connection?.accountId ?? '');
	let importFrom = $derived(data.importFrom ?? '');
	let errors = $state<{ accountId?: string; from?: string }>({});

	async function saveAccount(next: string) {
		if (!next || next === accountId) return;
		errors.accountId = undefined;
		// The first pick has nothing to go back to: no Deshacer.
		if (!accountId) {
			const r = await submitAction('?/account', { accountId: next });
			if (r.type === 'success') {
				accountId = next;
				toast.success('Cuenta guardada.');
				await refreshAll();
			} else errors.accountId = 'Elegí una cuenta en pesos.';
			return;
		}
		errors.accountId =
			(await autosave<{ accountId: string }>({
				path: '?/account',
				fields: { accountId: next },
				previous: { accountId },
				apply: (res) => (accountId = res.accountId)
			})) ?? undefined;
	}

	async function saveFrom(next: string) {
		if (!next || next === importFrom) return;
		errors.from =
			(await autosave<{ from: string }>({
				path: '?/importFrom',
				fields: { from: next },
				previous: { from: importFrom },
				apply: (res) => (importFrom = res.from)
			})) ?? undefined;
	}
</script>

<svelte:head>
	<title>Mercado Pago · Gastar</title>
</svelte:head>

<PageHeader
	title="Mercado Pago"
	back={{
		href: resolve('/profile/vinculaciones'),
		label: 'Volver a Vinculaciones',
		text: 'Vinculaciones'
	}}
/>

<div class="page">
	{#if data.flash}<p class="flash bad" role="alert">{data.flash}</p>{/if}
	{#if data.linked}<p class="flash" role="status">Mercado Pago vinculado.</p>{/if}

	{#if !data.connection}
		<section class="card" aria-labelledby="intro">
			<h2 id="intro">Traé tus pagos sin tipearlos</h2>
			<p>Importamos pagos, cobros y rendimientos. Vos aprobás cada uno antes de que cuente.</p>
			<form method="POST" action="?/connect">
				<Button type="submit" class="w-full">Vincular Mercado Pago</Button>
			</form>
		</section>
	{:else if data.connection.needsReconnect}
		<section class="card" aria-labelledby="intro">
			<h2 id="intro">Hay que volver a vincular</h2>
			<p>
				Mercado Pago ya no acepta el acceso guardado. Reconectá para seguir importando tus pagos.
			</p>
			<form method="POST" action="?/connect">
				<Button type="submit" class="w-full">Reconectar</Button>
			</form>
		</section>
	{:else}
		<p class="lead">Tu cuenta de Mercado Pago está vinculada.</p>

		<ListCard aria-label="Ajustes">
			<div role="listitem">
				<form method="POST" action="?/account">
					<OptionPicker
						variant="row"
						name="accountId"
						legend="Entra en"
						title="Cuenta que recibe los movimientos"
						items={data.accounts}
						bind:value={() => accountId, (v) => void saveAccount(v)}
						placeholder="Elegir"
						error={errors.accountId}
						errorId="account-error"
					>
						{#snippet empty()}
							<p class="hint">
								Necesitás una cuenta en pesos. <a href={resolve('/accounts/new')}>Crear cuenta</a>
							</p>
						{/snippet}
					</OptionPicker>
					<noscript><Button type="submit" variant="outline">Guardar</Button></noscript>
				</form>
			</div>
			{#if data.connection.accountId && data.importFrom}
				<div role="listitem">
					<form method="POST" action="?/importFrom" novalidate>
						<fieldset disabled={data.running}>
							<DatePicker
								name="from"
								label="Importar desde"
								bind:value={() => importFrom, (v) => void saveFrom(v)}
								min={data.earliest}
								max={data.today}
								error={errors.from}
								errorId="from-error"
							/>
						</fieldset>
						<noscript><Button type="submit" variant="outline">Guardar fecha</Button></noscript>
					</form>
				</div>
			{/if}
		</ListCard>
		{#if data.running}
			<p class="hint">Hay una sincronización en curso. Podés cambiar la fecha cuando termine.</p>
		{:else if data.connection.accountId}
			<p class="hint">Es la fecha mínima de cada sincronización. Hasta 12 meses para atrás.</p>
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

	.lead,
	.hint {
		margin: 0;
		color: var(--text-muted);
	}

	.hint {
		padding-inline: var(--space-4);
		font-size: var(--font-size-sm);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-5) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.card h2 {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.card p {
		margin: 0;
		color: var(--text-muted);
	}

	.card form {
		padding-top: var(--space-2);
	}

	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.flash {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.flash.bad {
		color: var(--negative);
	}
</style>
