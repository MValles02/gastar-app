<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
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
	// Without JavaScript there is no toast: the server-rendered status stands in until hydration.
	let hydrated = $state(false);
	onMount(() => (hydrated = true));
	// Toast once per saved redirect. The history entry is marked (state only, the URL keeps ?saved=1)
	// so back-nav to it does not re-fire; a new save is a new entry.
	$effect(() => {
		// formKey is new on every load, so each saved redirect re-runs this even though saved stays true.
		if (data.formKey && data.saved && !form && !(page.state as { toasted?: boolean }).toasted) {
			toast.success('Movimiento guardado.');
			replaceState('', { toasted: true } as App.PageState);
		}
	});
	const returnTo = $derived(cameFrom ?? (data.recurring ? '/plan' : '/'));
</script>

<svelte:head>
	<title>{data.recurring ? 'Registrar pago' : 'Nuevo movimiento'} · Gastar</title>
</svelte:head>

<PageHeader
	title={data.recurring ? 'Registrar pago' : 'Nuevo movimiento'}
	close={{ href: resolve(returnTo as '/'), label: 'Cerrar' }}
/>

{#if data.accounts.length === 0}
	<EmptyState icon="plus">Necesitás al menos una cuenta para registrar movimientos.</EmptyState>
	<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
{:else}
	{#if data.saved && !form && !hydrated}<p role="status">Movimiento guardado.</p>{/if}
	{#key data.formKey}
		<MovementForm
			initial={form?.values ??
				data.recurring?.initial ?? {
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
			recurring={data.recurring ?? undefined}
			repeatable
			repeatChecked={form?.values?.repeat === 'on'}
		/>
	{/key}
{/if}
