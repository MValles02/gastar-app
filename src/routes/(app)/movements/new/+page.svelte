<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import MovementForm from '../MovementForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// The + button opens this from any screen: back and Cancelar return there (same-origin path only).
	let cameFrom = $state<string | null>(null);
	afterNavigate(({ from }) => {
		const path = from ? from.url.pathname + from.url.search : '';
		// Not /movements/new itself: that is the ?saved=1 redirect after saving.
		if (
			from &&
			from.url.pathname !== '/movements/new' &&
			path.startsWith('/') &&
			!path.startsWith('//')
		)
			cameFrom = path;
	});
	const returnTo = $derived(cameFrom ?? '/');
</script>

<svelte:head>
	<title>Nuevo movimiento · Gastar</title>
</svelte:head>

<PageHeader title="Nuevo movimiento" back={{ href: resolve(returnTo as '/'), label: 'Volver' }} />

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
			submitLabel="Guardar movimiento"
			cancelHref={returnTo}
		/>
	{/key}
{/if}
