<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { stripFlags } from '#lib/nav-stack.svelte.ts';
	import { undoMovementSaved } from '#lib/undo-toast.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import Icon from '#lib/components/Icon.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import MovementForm from '../MovementForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// The + button opens this from any screen: back and Cancelar return there (same-origin path only).
	let cameFrom = $state<string | null>(null);

	afterNavigate(({ from, shallow, type }) => {
		if (shallow && type === 'goto') return;

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
	// Toast once per saved redirect, then strip ?saved so a reload does not toast again.
	let toasted: string | null = null;

	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return;

		if (data.saved && !form) {
			// Once per saved id, however many navigations land before the flag is stripped.
			if (data.saved !== toasted) {
				toasted = data.saved;
				undoMovementSaved(data.saved, data.savedRule);
			}
			void stripFlags();
		}
	});
	// Where saving returns to (validated by the action): the screen we came from, else the server's
	// Referer guess (no JS), else none and saving stays here for the next movement.
	const origin = $derived(cameFrom ?? form?.values?.returnTo ?? data.from ?? null);
	const returnTo = $derived(origin ?? '/');
</script>

<svelte:head>
	<title>Nuevo movimiento · Gastar</title>
</svelte:head>

<PageHeader title="Nuevo movimiento" close={{ href: resolve(returnTo as ''), label: 'Cerrar' }} />

{#if data.accounts.length === 0}
	<Empty.Root>
		<Empty.Header>
			<Empty.Media variant="icon"><Icon name="plus" size="1rem" /></Empty.Media>
			<Empty.Description
				>Necesitás al menos una cuenta para registrar movimientos.</Empty.Description
			>
		</Empty.Header>
	</Empty.Root>
	<Button href={resolve('accounts/new')}>Crear cuenta</Button>
{:else}
	{#if data.saved && !form && !hydrated}<p role="status">Movimiento guardado.</p>{/if}
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
			submitLabel="Guardar"
			cancelHref={returnTo}
			returnTo={origin}
			repeatable
			repeatChecked={form?.values?.repeat === 'on'}
		/>
	{/key}
{/if}
