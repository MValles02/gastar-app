<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailActions from '$lib/components/DetailActions.svelte';
	import DetailCard from '$lib/components/DetailCard.svelte';
	import DetailHero from '$lib/components/DetailHero.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const a = $derived(data.account);
	const labelId = $props.id();
</script>

{#snippet initialBalance()}
	<Money cents={a.initialBalance} currency={a.currency} tone="stock" />
{/snippet}

<svelte:head>
	<title>{a.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader title={a.name} back={{ href: resolve('/accounts'), label: 'Volver a cuentas' }} />

	<DetailHero cents={data.balance} currency={a.currency} label="Saldo" {labelId} />

	<DetailCard
		rows={[
			{ label: 'Moneda', value: a.currency },
			{ label: 'Saldo inicial', value: initialBalance },
			{ label: 'Estado', value: a.archived ? 'Archivada' : 'Activa' }
		]}
		movementsHref={resolve(`/movements?account=${a.id}`)}
	/>

	{#if form?.error}
		<p class="error" role="alert"><Icon name="alert" size="1rem" />{form.error}</p>
	{/if}

	<DetailActions editHref={resolve(`/accounts/${a.id}/edit`)}>
		{#snippet secondary()}
			{#if data.actions.canArchive}
				<form method="POST" action="?/archive" use:enhance>
					<Button type="submit" variant="outline" class="w-full">Archivar</Button>
				</form>
			{/if}
			{#if data.actions.canUnarchive}
				<form method="POST" action="?/unarchive" use:enhance>
					<Button type="submit" variant="outline" class="w-full">Desarchivar</Button>
				</form>
			{/if}
		{/snippet}
		{#snippet destructive()}
			{#if data.actions.canDelete}
				<ConfirmDialog
					triggerLabel="Eliminar"
					triggerVariant="destructive"
					triggerClass="w-full"
					title="¿Eliminar esta cuenta?"
					confirmLabel="Eliminar"
					action="?/delete"
				>
					Esta acción no se puede deshacer.
				</ConfirmDialog>
			{/if}
		{/snippet}
	</DetailActions>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
