<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { afterNavigate, invalidateAll, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ERROR_LABELS: Record<string, string> = {
		auth: 'token inválido o vencido',
		report_timeout: 'Mercado Pago tardó demasiado en generar el reporte',
		network: 'sin conexión con Mercado Pago',
		parse: 'reporte con formato inesperado',
		config: 'revisá la cuenta configurada'
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

	// The report takes ~45 s: refresh while the lease is held so the list fills in on its own.
	$effect(() => {
		if (!data.running) return;
		const id = setInterval(() => invalidateAll(), 3000);
		return () => clearInterval(id);
	});

	const status = $derived(
		data.running
			? 'Sincronizando…'
			: data.lastError
				? `No se pudo sincronizar (${errorLabel(data.lastError)})`
				: data.lastRun
					? `Última sincronización: ${data.lastRun}`
					: 'Todavía no se sincronizó.'
	);
</script>

<svelte:head>
	<title>Mercado Pago · Gastar</title>
</svelte:head>

<PageHeader title="Mercado Pago" back={{ href: resolve('/profile'), label: 'Volver a Perfil' }} />

<div class="page">
	{#if !data.configured}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="phone" size="1rem" /></Empty.Media>
				<Empty.Description>La importación de Mercado Pago no está configurada.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		{#if data.done && !hydrated}<p role="status">{DONE_MESSAGES[data.done]}</p>{/if}
		{#if bulkMessage && !data.done && !hydrated}<p role="status">{bulkMessage}</p>{/if}
		<div class="sync">
			<p class="status" class:error={!data.running && !!data.lastError} role="status">
				{status}
			</p>
			<form method="POST" action="?/sync" use:enhance>
				<Button type="submit" variant="outline" disabled={data.running}>Sincronizar ahora</Button>
			</form>
		</div>

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
				Se crean con la categoría o cuenta sugerida. Los que no tienen sugerencia quedan para
				revisar.
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

	.status {
		min-width: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
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
