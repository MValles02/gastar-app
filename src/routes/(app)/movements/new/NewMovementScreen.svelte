<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { afterNavigate, invalidateAll, refreshAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { highlightMovement } from '#lib/highlight.svelte.ts';
	import { NEW_MOVEMENT_PATH } from '#lib/movement.ts';
	import { stripFlags } from '#lib/nav-stack.svelte.ts';
	import { isModifiedClick, openShallow } from '#lib/open-shallow.ts';
	import { undoMovementSaved } from '#lib/undo-toast.ts';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import Icon from '#lib/components/Icon.svelte';
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
	let hydrated = $state(false);
	let toasted: string | null = null;
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
		onMount(() => (hydrated = true));
		// Toast once per saved redirect, then strip ?saved so a reload does not toast again.
		afterNavigate(({ shallow, type }) => {
			if (shallow && type === 'goto') return;
			const { id, ruleId } = data.saved;
			if (id && !form) {
				// Once per saved id, however many navigations land before the flag is stripped.
				if (id !== toasted) {
					toasted = id;
					undoMovementSaved(id, ruleId);
				}
				void stripFlags();
			}
		});
	}
	// Page: where saving returns to (validated by the action): the screen we came from, else the
	// server's Referer guess (no JS), else none and saving stays here for the next movement.
	const origin = $derived(cameFrom ?? form?.values?.returnTo ?? data.from ?? null);
	const returnTo = $derived(origin ?? '/');

	// Drawer, no accounts yet: "Nueva cuenta" opens as a nested drawer over this one. Modified clicks follow the link.
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
	drawerProps={{ hideTitle: true, bare: true }}
>
	{#if data.accounts.length === 0}
		{#if drawer}
			<div class="empty">
				<p>Necesitás al menos una cuenta para registrar movimientos.</p>
				<Button href={resolve('accounts/new')} onclick={createAccount}>Crear cuenta</Button>
			</div>
		{:else}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="plus" size="1rem" /></Empty.Media>
					<Empty.Description
						>Necesitás al menos una cuenta para registrar movimientos.</Empty.Description
					>
				</Empty.Header>
			</Empty.Root>
			<Button href={resolve('accounts/new')}>Crear cuenta</Button>
		{/if}
	{:else if drawer}
		{@render movementForm()}
	{:else}
		{#if data.saved.id && !form && !hydrated}<p role="status">Movimiento guardado.</p>{/if}
		{#key data.formKey}
			{@render movementForm()}
		{/key}
	{/if}
	{#if drawer}
		<BottomDrawer title="Nueva cuenta" nested bind:open={accountOpen}>
			<AccountForm initial={{}} onsaved={accountSaved} onclose={() => (accountOpen = false)} />
		</BottomDrawer>
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
