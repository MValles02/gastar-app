<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import Icon from '#lib/components/Icon.svelte';
	import IconBadge from '#lib/components/IconBadge.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import Money from '#lib/components/Money.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const UNDONE = 'Aprobación deshecha. Quedó para revisar.';

	// Without JavaScript there is no toast: the action's answer shows as a status line instead.
	let hydrated = $state(false);
	onMount(() => (hydrated = true));
	const noJsMessage = $derived(
		form && 'message' in form ? form.message : form && 'undoneId' in form ? UNDONE : null
	);
</script>

<svelte:head>
	<title>Aprobados automáticamente · Gastar</title>
</svelte:head>

<PageHeader
	title="Aprobados automáticamente"
	back={{ href: resolve('imports'), label: 'Volver a Importados', text: 'Importados' }}
/>

<div class="page">
	{#if noJsMessage && !hydrated}<p role="status">{noJsMessage}</p>{/if}

	<p class="hint">
		Últimos 30 días. Los reconocimos por lo que ya aprobaste; si alguno no va, deshacelo y queda
		para revisar.
	</p>

	{#if data.items.length === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="movements" size="1rem" /></Empty.Media>
				<Empty.Description>Nada aprobado automáticamente en los últimos 30 días.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<ListCard aria-label="Aprobados automáticamente">
			{#each data.items as item (item.id)}
				<div role="listitem" class="row">
					<IconBadge
						letter={item.title.charAt(0).toUpperCase()}
						color={null}
						size="2.25rem"
						neutral
					/>
					<div class="text">
						<span class="title">{item.title}</span>
						<span class="meta">{item.target ? `${item.target} · ${item.date}` : item.date}</span>
					</div>
					<div class="side">
						<span class="amount">
							<Money
								cents={item.amount}
								currency={item.currency}
								tone="flow"
								direction={item.isCredit ? 'income' : 'outcome'}
							/>
						</span>
						<form
							method="POST"
							action="?/undo"
							use:enhance={() =>
								async ({ result, update }) => {
									if (result.type === 'success') toast.success(UNDONE);
									else
										toast.error(
											(result.type === 'failure' &&
												(result.data as { message?: string } | undefined)?.message) ||
												'No se pudo deshacer.'
										);
									await update();
								}}
						>
							<input type="hidden" name="id" value={item.id} />
							<button type="submit" class="pill" aria-label="Deshacer {item.title}">Deshacer</button
							>
						</form>
					</div>
				</div>
			{/each}
		</ListCard>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.hint {
		margin: 0;
		padding-inline: var(--space-4);
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 4rem;
		padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
	}

	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.title,
	.meta {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.title {
		font-weight: 500;
	}

	.meta {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.side {
		display: flex;
		flex: none;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
	}

	.amount {
		font-family: var(--font-display);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* 32px pill with a 44px tap target, like the inbox's Aprobar. */
	.pill {
		position: relative;
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

	.pill::after {
		content: '';
		position: absolute;
		inset: -0.375rem -0.25rem;
	}

	.pill:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
</style>
