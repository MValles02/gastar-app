<script lang="ts">
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import Money from '#lib/components/Money.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import RowPill from '#lib/components/RowPill.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const UNDONE = 'Aprobación deshecha. Quedó para revisar.';

	// Without JavaScript there is no toast: the action's answer shows as a status line instead.
	const ready = hydrated();
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
	{#if noJsMessage && !ready.current}<p role="status">{noJsMessage}</p>{/if}

	<p class="hint">
		Últimos 30 días. Los reconocimos por lo que ya aprobaste; si alguno no va, deshacelo y queda
		para revisar.
	</p>

	{#if data.items.length === 0}
		<EmptyState
			icon="movements"
			description="Nada aprobado automáticamente en los últimos 30 días."
		/>
	{:else}
		<ListCard aria-label="Aprobados automáticamente">
			{#each data.items as item (item.id)}
				{#snippet meta()}{item.target ? `${item.target} · ${item.date}` : item.date}{/snippet}
				{#snippet side()}
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
						<RowPill label="Deshacer" ariaLabel="Deshacer {item.title}" />
					</form>
				{/snippet}
				<ListRow
					lead={{ letter: item.title.charAt(0).toUpperCase(), color: null }}
					title={item.title}
					{meta}
					action={side}
				/>
			{/each}
		</ListCard>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.hint {
		margin: 0;
		padding-inline: var(--space-4);
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.amount {
		font-family: var(--font-display);
		font-size: var(--font-size-base);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
