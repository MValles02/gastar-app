<script lang="ts">
	import { onMount } from 'svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { afterNavigate, invalidateAll, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import ActionLink from '$lib/components/ActionLink.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const ERROR_LABELS: Record<string, string> = {
		auth: 'token inválido o vencido',
		report_timeout: 'Mercado Pago tardó demasiado en generar el reporte',
		network: 'sin conexión con Mercado Pago',
		parse: 'reporte con formato inesperado',
		config: 'revisá la cuenta configurada',
		reconnect: 'hay que volver a vincular Mercado Pago'
	};

	const errorLabel = (code: string) =>
		ERROR_LABELS[code] ?? `error ${code.replace(/^mp_/, '')} de Mercado Pago`;

	const DONE_MESSAGES = {
		approved: 'Movimiento aprobado.',
		rejected: 'Movimiento descartado.',
		stale: 'Ese movimiento ya fue revisado.'
	};

	const bulkMessage = $derived.by(() => {
		if (!data.bulk) return null;
		const { approved, skipped } = data.bulk;
		const head =
			approved === 1 ? 'Se aprobó 1 movimiento.' : `Se aprobaron ${approved} movimientos.`;
		if (skipped === 0) return head;
		return `${head} ${skipped === 1 ? '1 quedó pendiente.' : `${skipped} quedaron pendientes.`}`;
	});

	// Without JavaScript there is no toast: the server-rendered status stands in until hydration.
	let hydrated = $state(false);
	onMount(() => (hydrated = true));
	// Toast once per redirect, then strip ?done from the URL so a reload does not toast again. Runs in
	// afterNavigate because replaceState throws before the router is initialized (hard load), hence the retry.
	const stripDone = () => {
		try {
			const url = new URL(page.url);
			for (const k of ['done', 'approved', 'skipped']) url.searchParams.delete(k);
			replaceState(resolve((url.pathname + url.search + url.hash) as '/'), {});
		} catch {
			setTimeout(stripDone, 50);
		}
	};
	afterNavigate(() => {
		if (data.done) {
			(data.done === 'stale' ? toast.info : toast.success)(DONE_MESSAGES[data.done]);
			stripDone();
		} else if (data.bulk && bulkMessage) {
			(data.bulk.skipped === 0 && data.bulk.approved > 0 ? toast.success : toast.info)(bulkMessage);
			stripDone();
		}
	});

	// Poll while the lease is held (also a scheduled run found on load): the progress and the list
	// fill in on their own, payments first and the report items when the report lands (1-3 min).
	$effect(() => {
		if (!data.running) return;
		const id = setInterval(() => invalidateAll(), 2000);
		return () => clearInterval(id);
	});

	// A run seen on this page ends in "Listo"; on a fresh load the last sync time stands alone.
	let watched = $state(false);
	$effect(() => {
		if (data.running) watched = true;
	});

	const newLabel = (n: number) =>
		n === 0 ? 'Sin movimientos nuevos' : n === 1 ? '1 movimiento nuevo' : `${n} movimientos nuevos`;

	const status = $derived(
		data.phase === 'payments'
			? 'Buscando pagos…'
			: data.phase === 'report'
				? 'Esperando el reporte de Mercado Pago (rendimientos y pagos en comercios)…'
				: data.lastError
					? `No se pudo sincronizar (${errorLabel(data.lastError)})`
					: data.lastRun
						? `${watched ? 'Listo. ' : ''}Última sincronización: ${data.lastRun}`
						: 'Todavía no se sincronizó.'
	);

	const detail = $derived(
		data.phase === 'report'
			? `${newLabel(data.newItems ?? 0)}. Puede tardar de 1 a 3 minutos.`
			: watched && !data.running && data.newItems !== null
				? `${newLabel(data.newItems)}.`
				: null
	);
</script>

<svelte:head>
	<title>Mercado Pago · Gastar</title>
</svelte:head>

<PageHeader title="Mercado Pago" back={{ href: resolve('/profile'), label: 'Volver a Perfil' }} />

<div class="page">
	{#if data.done && !hydrated}<p role="status">{DONE_MESSAGES[data.done]}</p>{/if}
	{#if bulkMessage && !data.done && !hydrated}<p role="status">{bulkMessage}</p>{/if}
	<div class="sync">
		<div
			class="status"
			class:running={data.running}
			class:error={!data.running && !!data.lastError}
			role="status"
		>
			{#if data.running}<LoaderCircle class="spin" aria-hidden="true" />{/if}
			<p>
				{status}
				{#if detail}<span class="detail">{detail}</span>{/if}
			</p>
		</div>
		{#if data.needsReconnect}
			<Button href={resolve('/profile/mercado-pago')} variant="outline">Reconectar</Button>
		{:else}
			<form method="POST" action="?/sync" use:enhance>
				<Button type="submit" variant="outline" disabled={data.running}>Sincronizar ahora</Button>
			</form>
		{/if}
	</div>
	{#if !data.needsReconnect}
		<!-- novalidate: the server owns the range check and answers with its own message. -->
		<form
			method="POST"
			action="?/importFrom"
			use:enhance
			novalidate
			onchange={(e) => e.currentTarget.requestSubmit()}
		>
			<fieldset disabled={data.running}>
				<DatePicker
					name="from"
					label="Importar desde"
					value={data.importFrom}
					min={data.earliest}
					max={data.today}
				/>
				{#if form?.importFromError}<p class="error" role="alert">{form.importFromError}</p>{/if}
				{#if !hydrated}<Button type="submit" variant="outline">Guardar fecha</Button>{/if}
			</fieldset>
		</form>
	{/if}
	<ActionLink href="/profile/mercado-pago" label="Configurar" />

	{#if data.suggested > 0}
		<ConfirmDialog
			triggerLabel={data.suggested === 1
				? 'Aprobar 1 sugerido'
				: `Aprobar ${data.suggested} sugeridos`}
			triggerVariant="default"
			triggerClass="w-full"
			title={data.suggested === 1
				? '¿Aprobar 1 movimiento sugerido?'
				: `¿Aprobar ${data.suggested} movimientos sugeridos?`}
			confirmLabel="Aprobar"
			confirmVariant="default"
			action="?/approveSuggested"
		>
			Se crean con la categoría o cuenta sugerida. Los que no tienen sugerencia quedan para revisar.
		</ConfirmDialog>
	{/if}

	{#if data.groups.length === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="movements" size="1rem" /></Empty.Media>
				<Empty.Description>No hay movimientos para revisar.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<div class="groups">
			{#each data.groups as g (g.day)}
				<section aria-labelledby="day-{g.day}">
					<h2 id="day-{g.day}">{g.heading}</h2>
					<ListCard>
						{#each g.items as item (item.id)}
							{#snippet value()}
								<Money
									cents={item.amount}
									currency="ARS"
									tone="flow"
									direction={item.isCredit ? 'income' : 'outcome'}
								/>
							{/snippet}
							{#snippet suggestion()}Sugerido: {item.suggestion}{/snippet}
							<ListRow
								href={resolve(`/imports/${item.id}`)}
								lead={{ letter: item.title.charAt(0).toUpperCase(), color: null }}
								title={item.title}
								{value}
								meta={item.suggestion ? suggestion : undefined}
							/>
						{/each}
					</ListCard>
				</section>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.sync {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.error {
		margin: 0;
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.status {
		display: flex;
		flex: 1 1 14rem;
		align-items: flex-start;
		gap: var(--space-2);
		min-width: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.status :global(.spin) {
		flex: none;
		width: 1rem;
		height: 1lh;
	}

	@media (prefers-reduced-motion: no-preference) {
		.status :global(.spin) {
			animation: spin 1s linear infinite;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}

	.status.running {
		color: var(--text);
	}

	.detail {
		display: block;
		color: var(--text-muted);
	}

	.status.error {
		color: var(--negative);
	}

	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	h2 {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-muted);
		padding-inline: var(--space-4);
		margin-bottom: var(--space-2);
	}
</style>
