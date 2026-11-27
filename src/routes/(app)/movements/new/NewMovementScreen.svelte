<script lang="ts">
	import { untrack } from 'svelte';
	import { afterNavigate, invalidateAll, refreshAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { highlightMovement } from '#lib/highlight.svelte.ts';
	import { NEW_MOVEMENT_PATH } from '#lib/movement.ts';
	import { isModifiedClick, openShallow } from '#lib/open-shallow.ts';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import { toastSavedMovement, undoMovementSaved } from '#lib/movement-saved.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import EmptyState from '#lib/components/base/EmptyState.svelte';
	import AccountForm from '#lib/components/accounts/AccountForm.svelte';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import MovementForm from '../MovementForm.svelte';
	import type { ActionData, PageData } from './$types';

	// "Nuevo movimiento": the /movements/new page, or (`onclose`) the drawer the + button opens over the
	// current screen.
	let { data, form, onclose }: { data: PageData; form?: ActionData; onclose?: () => void } =
		$props();
	const drawer = $derived(!!onclose);

	// Page: the + button opens this from any screen: back and Cancelar return there (same-origin path only).
	let cameFrom = $state<string | null>(null);
	// Without JavaScript there is no toast: the server-rendered status stands in until hydration.
	const mounted = hydrated();
	if (!untrack(() => drawer)) {
		afterNavigate(({ from, shallow, type }) => {
			if (shallow && type === 'goto') return;
			const path = from ? from.url.pathname + from.url.search : '';
			// Not /movements/new itself: that is the ?saved=1 redirect after saving.
			if (
				from &&
				from.url.pathname !== NEW_MOVEMENT_PATH &&
				path.startsWith('/') &&
				!path.startsWith('//')
			)
				cameFrom = path;
		});
		// The ?saved=<id> redirect after saving here; a failed post (`form`) does not toast it again.
		toastSavedMovement(() => (form ? { id: null, ruleId: null } : data.saved));
	}
	// Page: where saving returns to (validated by the action): the screen we came from, else the
	// server's Referer guess (no JS), else none and saving stays here for the next movement.
	const origin = $derived(cameFrom ?? form?.values?.returnTo ?? data.from ?? null);
	const returnTo = $derived(origin ?? '/');

	// Drawer, no accounts yet: "Nueva cuenta" opens as a sub-task drawer (FormScreen `bind:open`) stacked over this one. Modified clicks follow the link.
	let accountOpen = $state(false);
	function createAccount(e: MouseEvent) {
		if (isModifiedClick(e)) return;
		e.preventDefault();
		accountOpen = true;
	}

	// Reloads the page behind and this drawer's data, so the movement form opens with the new account.
	async function accountSaved() {
		await refreshAll();
		await openShallow(null, resolve('movements/new'), 'newMovement', { replace: true });
		accountOpen = false;
		toast.success('Guardado.');
	}

	async function saved({ id, ruleId }: { id: string; ruleId: string | null }) {
		undoMovementSaved(id, ruleId);
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await invalidateAll();
		onclose?.();
		highlightMovement(id);
	}
</script>

{#snippet movementForm()}
	<MovementForm
		initial={form?.values ?? data.initial}
		errors={form?.errors}
		accounts={data.accounts}
		categories={data.categories}
		returnTo={drawer ? page.url.pathname + page.url.search : origin}
		repeatable
		repeatChecked={form?.values?.repeat === 'on'}
		onsaved={saved}
	/>
{/snippet}

<FormScreen
	title="Nuevo movimiento"
	close={{ href: resolve(returnTo as ''), label: 'Cerrar' }}
	{onclose}
	drawerProps={{ hideTitle: true, bare: true, initialFocus: 'input[name="amount"]' }}
>
	{#if data.accounts.length === 0}
		{#if drawer}
			<div class="empty">
				<p>Necesitás al menos una cuenta para registrar movimientos.</p>
				<Button href={resolve('accounts/new')} onclick={createAccount}>Crear cuenta</Button>
			</div>
		{:else}
			<EmptyState icon="plus" text="Necesitás al menos una cuenta para registrar movimientos.">
				{#snippet action()}
					<Button href={resolve('accounts/new')}>Crear cuenta</Button>
				{/snippet}
			</EmptyState>
		{/if}
	{:else if drawer}
		{@render movementForm()}
	{:else}
		{#if data.saved.id && !form && !mounted.current}<p role="status">Movimiento guardado.</p>{/if}
		{#key data.formKey}
			{@render movementForm()}
		{/key}
	{/if}
	{#if drawer}
		<FormScreen title="Nueva cuenta" bind:open={accountOpen} onclose={() => (accountOpen = false)}>
			<AccountForm initial={{}} onsaved={accountSaved} />
		</FormScreen>
	{/if}
</FormScreen>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom));
	}
</style>
