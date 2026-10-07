<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import RecurringForm from '../RecurringForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>{data.values.description} · Gastar</title>
</svelte:head>

<PageHeader
	title={data.values.description}
	back={{ href: resolve('/plan'), label: 'Volver al plan' }}
/>

<div class="detail">
	{#if data.inactiveReason}
		<p class="inactive">{data.inactiveReason}: no se puede registrar el pago.</p>
	{/if}

	{#key data.id}
		<RecurringForm
			initial={form?.values ?? data.values}
			errors={form?.errors}
			accounts={data.accounts}
			categories={data.categories}
			action="?/update"
			submitLabel="Guardar cambios"
		/>
	{/key}

	<div class="more">
		<form method="POST" action="?/archive" use:enhance>
			<Button type="submit" variant="secondary">{data.archived ? 'Reactivar' : 'Archivar'}</Button>
		</form>
		<ConfirmDialog
			triggerLabel="Eliminar"
			triggerVariant="danger"
			title="¿Eliminar este movimiento fijo?"
			confirmLabel="Eliminar"
			action="?/delete"
		>
			Los movimientos ya registrados se mantienen.
		</ConfirmDialog>
	</div>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.inactive {
		color: var(--text-muted);
		font-weight: 500;
	}

	.more {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		padding-top: var(--space-5);
		border-top: 1px solid var(--border);
	}
</style>
