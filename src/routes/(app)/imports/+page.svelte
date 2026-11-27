<script lang="ts">
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { afterNavigate, refreshAll } from '$app/navigation';
	import { ALREADY_REVIEWED, cardNetworkName, UNMATCHED_FAILED } from '#lib/imports.ts';
	import { stripFlags } from '#lib/nav-stack.svelte.ts';
	import { IMPORT_FLAGS } from '#lib/toast-flags.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import RowPill from '#lib/components/RowPill.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import Amount from '#lib/components/base/Amount.svelte';
	import { formatDay } from '#lib/locale.ts';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import ImportRow from './ImportRow.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const DONE_MESSAGES = {
		approved: 'Movimiento aprobado.',
		rejected: 'Movimiento descartado.',
		stale: ALREADY_REVIEWED
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
	const ready = hydrated();
	// Toast once per redirect, then strip its flags from the URL so a reload does not toast again.
	const stripDone = () => stripFlags(IMPORT_FLAGS);
	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return;
		if (data.done) {
			(data.done === 'stale' ? toast.info : toast.success)(DONE_MESSAGES[data.done]);
			stripDone();
		} else if (data.bulk && bulkMessage) {
			(data.bulk.skipped === 0 && data.bulk.approved > 0 ? toast.success : toast.info)(bulkMessage);
			stripDone();
		} else if (data.upload && uploadMessage) {
			(data.upload.created > 0 ? toast.success : toast.info)(uploadMessage);
			stripDone();
		}
	});

	// Poll while the lease is held (also a scheduled run found on load): the progress and the list
	// fill in on their own, payments first and the report items when the report lands (1-3 min).
	// refreshAll keeps the review drawer's shallow-route state (invalidateAll would reset it and close it).
	$effect(() => {
		if (!data.running) return;
		const id = setInterval(() => refreshAll(), 2000);
		return () => clearInterval(id);
	});

	// A run seen on this page ends in "Listo"; on a fresh load the last sync time stands alone.
	let watched = $state(false);
	$effect(() => {
		if (data.running) watched = true;
	});

	const newLabel = (n: number) =>
		n === 0 ? 'Sin movimientos nuevos' : n === 1 ? '1 movimiento nuevo' : `${n} movimientos nuevos`;

	const autoLabel = (n: number) =>
		n === 1 ? '1 aprobado automáticamente' : `${n} aprobados automáticamente`;

	// After a statement upload: "3 movimientos nuevos, 2 aprobados automáticamente."
	const uploadMessage = $derived(
		data.upload
			? `${newLabel(data.upload.created)}${data.upload.auto ? `, ${autoLabel(data.upload.auto)}` : ''}.`
			: null
	);

	const status = $derived(
		data.needsReconnect
			? 'Hay que volver a vincular Mercado Pago.'
			: data.lastError
				? `No se pudo sincronizar (${data.lastError})`
				: watched && data.newItems !== null
					? `Listo. ${newLabel(data.newItems)}${data.autoApproved ? `, ${autoLabel(data.autoApproved)}` : ''}.`
					: (data.lastRun ?? 'Todavía no se sincronizó')
	);

	// Gmail's failure shows next to Mercado Pago's result, never instead of it.
	const gmailStatus = $derived(
		data.gmailError ? `No se pudo sincronizar Gmail (${data.gmailError})` : null
	);
</script>

<svelte:head>
	<title>Importados · Gastar</title>
</svelte:head>

<PageHeader
	title="Importados"
	back={{ href: resolve(''), label: 'Volver al inicio', text: 'Inicio' }}
/>

<div class="page">
	{#if data.done && !ready.current}<p role="status">{DONE_MESSAGES[data.done]}</p>{/if}
	{#if bulkMessage && !data.done && !ready.current}<p role="status">{bulkMessage}</p>{/if}
	{#if uploadMessage && !data.done && !data.bulk && !ready.current}<p role="status">
			{uploadMessage}
		</p>{/if}

	<!-- The sync line is Mercado Pago's and Gmail's: without a link only the pending items show. -->
	{#if data.mpLinked && data.running}
		<Card.Root
			role="status"
			aria-label="Sincronización"
			class="min-h-14 flex-row items-start gap-3 px-4 py-3"
		>
			<LoaderCircle class="spin" aria-hidden="true" />
			<p class="running">
				Sincronizando…
				<span class="detail">Puede tardar unos minutos.</span>
			</p>
		</Card.Root>
	{:else if data.mpLinked || data.gmailLinked}
		<Card.Root
			aria-label="Sincronización"
			class="min-h-14 flex-row items-center gap-3 px-4 py-2 [&_svg]:flex-none"
		>
			<div class="messages">
				<p class="status" class:error={data.needsReconnect || !!data.lastError} role="status">
					{status}
				</p>
				{#if gmailStatus}<p class="status error" role="status">{gmailStatus}</p>{/if}
			</div>
			{#if data.needsReconnect}
				<Button
					href={resolve('profile/mercado-pago')}
					variant="outline"
					class="h-10 rounded-full px-4">Reconectar</Button
				>
			{:else}
				<form method="POST" action="?/sync" use:enhance>
					<Button type="submit" variant="outline" class="h-10 rounded-full px-4">
						<RefreshCw aria-hidden="true" />Sincronizar
					</Button>
				</form>
			{/if}
		</Card.Root>
	{/if}

	{#if data.unknownCards.length > 0}
		<ListCard aria-label="Tarjetas por definir">
			{#each data.unknownCards as c (c.network + c.last4)}
				<ListRow
					href={resolve(`profile/gmail/cards/${c.slug}`)}
					lead={{ icon: 'card', color: null }}
					title="Tarjeta {cardNetworkName(c.network)} ••{c.last4}: elegí qué es"
					chevron
				/>
			{/each}
		</ListCard>
	{/if}

	{#if data.unmatched.length > 0}
		<section aria-labelledby="unmatched-title">
			<h2 id="unmatched-title">No apareció en el resumen</h2>
			<ListCard>
				{#each data.unmatched as item (item.id)}
					{#snippet meta()}
						{formatDay(item.day)} ·
						<Amount cents={item.amount} currency={item.currency} tone="expense" />
					{/snippet}
					{#snippet choices()}
						<span class="choices">
							{#each [{ action: 'discardUnmatched', label: 'Descartar', failed: UNMATCHED_FAILED.discard }, { action: 'keepUnmatched', label: 'Dejar', failed: UNMATCHED_FAILED.keep }] as a (a.action)}
								<form
									method="POST"
									action="?/{a.action}"
									use:enhance={() =>
										async ({ result, update }) => {
											if (result.type === 'success') {
												toast.success(
													a.action === 'discardUnmatched' ? 'Movimiento descartado.' : 'Listo.'
												);
											} else if (result.type === 'failure') {
												toast.error(
													(result.data as { message?: string } | undefined)?.message ?? a.failed
												);
											} else {
												toast.error(a.failed);
											}
											await update();
										}}
								>
									<input type="hidden" name="id" value={item.id} />
									<RowPill label={a.label} />
								</form>
							{/each}
						</span>
					{/snippet}
					<ListRow title={item.title} {meta} action={choices} />
				{/each}
			</ListCard>
		</section>
	{/if}

	{#if data.autoCount > 0}
		<a class="auto" href={resolve('imports/auto')}>
			<span class="label">{autoLabel(data.autoCount)}</span>
			<ChevronRight aria-hidden="true" />
		</a>
	{/if}

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
		<EmptyState icon="movements" description="No hay movimientos para revisar." />
	{:else}
		<div class="groups">
			{#each data.groups as g (g.day)}
				<section aria-labelledby="day-{g.day}">
					<h2 id="day-{g.day}">{g.heading}</h2>
					<ListCard>
						{#each g.items as item (item.id)}
							<ImportRow {item} />
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

	.messages {
		flex: 1;
		min-width: 0;
	}

	.status {
		min-width: 0;
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.status.error {
		color: var(--negative);
		font-weight: 400;
		font-size: var(--font-size-sm);
	}

	.running {
		margin: 0;
		font-weight: 500;
	}

	.page :global(.spin) {
		flex: none;
		width: 1.25rem;
		height: 1lh;
		color: var(--primary);
	}

	@media (prefers-reduced-motion: no-preference) {
		.page :global(.spin) {
			animation: spin 1s linear infinite;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}

	.detail {
		display: block;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		font-weight: 400;
	}

	/* A quiet line, not a card: what already counted, one tap away from undoing it. */
	.auto {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 2.75rem;
		padding-inline: var(--space-4);
		color: var(--text);
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-decoration: none;
	}

	.auto .label {
		flex: 1;
	}

	.auto :global(svg) {
		flex: none;
		width: 1rem;
		height: 1rem;
		color: var(--text-muted);
	}

	.auto:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
		border-radius: var(--radius-card);
	}

	/* An alert without a statement line: Descartar and Dejar side by side. */
	.choices {
		display: flex;
		gap: var(--space-2);
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
