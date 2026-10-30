<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import { SHEET_FORM } from '$lib/sheet.svelte';
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
	// Toast once per saved redirect, then strip ?saved from the URL so a reload does not toast
	// again. Runs in afterNavigate because replaceState throws before the router is initialized
	// (hard load of ?saved=1), hence the retry.
	const stripSaved = () => {
		try {
			const url = new URL(page.url);
			url.searchParams.delete('saved');
			replaceState(resolve((url.pathname + url.search + url.hash) as '/'), {});
		} catch {
			setTimeout(stripSaved, 50);
		}
	};
	afterNavigate(() => {
		if (data.saved && !form) {
			toast.success('Movimiento guardado.');
			stripSaved();
		}
	});
	// Where saving returns to (validated by the action): the screen we came from, else the server's
	// Referer guess (no JS), else none and saving stays here for the next movement.
	const origin = $derived(cameFrom ?? form?.values?.returnTo ?? data.from ?? null);
	const returnTo = $derived(origin ?? (data.recurring ? '/plan' : '/'));
</script>

<svelte:head>
	<title>{data.recurring ? 'Registrar pago' : 'Nuevo movimiento'} · Gastar</title>
</svelte:head>

<SheetHeader
	title={data.recurring ? 'Registrar pago' : 'Nuevo movimiento'}
	cancel={{ href: resolve(returnTo as '/') }}
	submit={data.accounts.length ? {} : undefined}
>
	{#if data.accounts.length === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="plus" size="1rem" /></Empty.Media>
				<Empty.Description
					>Necesitás al menos una cuenta para registrar movimientos.</Empty.Description
				>
			</Empty.Header>
		</Empty.Root>
		<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
	{:else}
		{#if origin}<input type="hidden" name="returnTo" form={SHEET_FORM} value={origin} />{/if}
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
				recurring={data.recurring ?? undefined}
				repeatable
				repeatChecked={form?.values?.repeat === 'on'}
			/>
		{/key}
	{/if}
</SheetHeader>
