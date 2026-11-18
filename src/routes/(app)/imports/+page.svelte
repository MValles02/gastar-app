<script lang="ts">
	import { onMount } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { afterNavigate, refreshAll } from '$app/navigation';
	import { ALREADY_REVIEWED } from '#lib/imports.ts';
	import { stripFlags } from '#lib/nav-stack.svelte.ts';
	import { IMPORT_FLAGS } from '#lib/toast-flags.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import Money from '#lib/components/Money.svelte';
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
	let hydrated = $state(false);
	onMount(() => (hydrated = true));
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
	{#if data.done && !hydrated}<p role="status">{DONE_MESSAGES[data.done]}</p>{/if}
	{#if bulkMessage && !data.done && !hydrated}<p role="status">{bulkMessage}</p>{/if}
	{#if uploadMessage && !data.done && !data.bulk && !hydrated}<p role="status">
			{uploadMessage}
		</p>{/if}

	<!-- The sync line is Mercado Pago's and Gmail's: without a link only the pending items show. -->
	{#if data.mpLinked && data.running}
		<section class="sync running" role="status" aria-label="Sincronización">
			<LoaderCircle class="spin" aria-hidden="true" />
			<p>
				Sincronizando…
				<span class="detail">Puede tardar unos minutos.</span>
			</p>
		</section>
	{:else if data.mpLinked || data.gmailLinked}
		<section class="sync" aria-label="Sincronización">
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
		</section>
	{/if}

	{#if data.unknownCards.length > 0}
		<ListCard aria-label="Tarjetas por definir">
			{#each data.unknownCards as c (c.network + c.last4)}
				<ListRow
					href={resolve(`profile/gmail/cards/${c.slug}`)}
					lead={{ icon: 'card', color: null }}
					title="Tarjeta Visa ••{c.last4}: elegí qué es"
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
					<div role="listitem" class="unmatched">
						<div class="text">
							<span class="title">{item.title}</span>
							<span class="meta">
								{formatDay(item.day)} ·
								<Money
									cents={item.amount}
									currency={item.currency}
									tone="flow"
									direction="outcome"
								/>
							</span>
						</div>
						{#each [{ action: 'discardUnmatched', label: 'Descartar', failed: 'No se pudo descartar.' }, { action: 'keepUnmatched', label: 'Dejar', failed: 'No se pudo guardar.' }] as a (a.action)}
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
								<button type="submit" class="pill">{a.label}</button>
							</form>
						{/each}
					</div>
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
		gap: var(--space-4);
	}

	/* One line: the last sync (or the progress) and its action. */
	.sync {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
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

	.sync :global(svg) {
		flex: none;
	}

	.sync.running {
		align-items: flex-start;
		padding-block: var(--space-3);
	}

	.sync.running p {
		margin: 0;
		font-weight: 500;
	}

	.sync :global(.spin) {
		width: 1.25rem;
		height: 1lh;
		color: var(--primary);
	}

	@media (prefers-reduced-motion: no-preference) {
		.sync :global(.spin) {
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

	/* An alert without a statement line: its text and the two choices. */
	.unmatched {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 4rem;
		padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
	}

	.unmatched .text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.unmatched .title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.unmatched .meta {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.pill {
		display: inline-flex;
		align-items: center;
		height: 2rem;
		padding: 0 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text);
		font-size: var(--font-size-xs);
		font-weight: 500;
		cursor: pointer;
	}

	.pill:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
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
