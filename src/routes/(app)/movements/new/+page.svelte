<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import MovementForm from '../MovementForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Nuevo movimiento · Gastar</title>
</svelte:head>

<PageHeader title="Nuevo movimiento" />

{#if data.accounts.length === 0}
	<EmptyState icon="plus">Necesitás al menos una cuenta para registrar movimientos.</EmptyState>
	<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
{:else}
	{#if data.saved && !form}<p role="status">Movimiento guardado.</p>{/if}
	{#key data.formKey}
		<MovementForm
			initial={form?.values ?? {
				type: 'outcome',
				amount: '',
				description: '',
				accountId: data.defaultAccountId,
				destinationAccountId: '',
				exchangeRate: '',
				categoryId: '',
				occurredAt: data.now
			}}
			errors={form?.errors}
			accounts={data.accounts}
			categories={data.categories}
			now={data.now}
			submitLabel="Guardar movimiento"
			cancelHref="/"
		/>
	{/key}
{/if}
