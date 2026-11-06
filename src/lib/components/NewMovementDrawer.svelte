<script lang="ts">
	import { goto, invalidateAll, preloadData, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { highlightMovement } from '$lib/highlight.svelte';
	import { undoMovementSaved } from '$lib/undo-toast';
	import MovementForm from '../../routes/(app)/movements/MovementForm.svelte';
	import type { PageData } from '../../routes/(app)/movements/new/$types';
	import BottomDrawer from './BottomDrawer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * "Nuevo movimiento" opened from the + button over the current screen (shallow route: the URL does not
	 * change and the back gesture closes it). `data` is the preloaded /movements/new load.
	 */
	let { data }: { data: PageData } = $props();

	// The drawer's history entry goes away with the back gesture, Cancelar, the scrim or Escape.
	function close() {
		if (page.state.newMovement) history.back();
	}

	// Swaps this drawer for "Nueva cuenta" in the same history entry (replaceState), so closing it
	// returns to the page underneath. Modified clicks and failed loads follow the link.
	async function createAccount(e: MouseEvent) {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
			return;
		e.preventDefault();
		const href = resolve('/accounts/new');
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200)
			replaceState('', { newAccount: result.data as App.PageState['newAccount'] });
		else await goto(href);
	}

	async function saved({ id, ruleId }: { id: string; ruleId: string | null }) {
		undoMovementSaved(id, ruleId);
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await invalidateAll();
		close();
		highlightMovement(id);
	}
</script>

<BottomDrawer title="Nuevo movimiento" hideTitle bare open onclose={close}>
	{#if data.accounts.length === 0}
		<div class="empty">
			<p>Necesitás al menos una cuenta para registrar movimientos.</p>
			<Button href={resolve('/accounts/new')} onclick={createAccount}>Crear cuenta</Button>
		</div>
	{:else}
		<MovementForm
			variant="drawer"
			initial={{
				type: 'outcome',
				amount: '',
				description: '',
				accountId: data.defaultAccountId,
				destinationAccountId: '',
				exchangeRate: '',
				categoryId: '',
				occurredAt: data.now
			}}
			accounts={data.accounts}
			categories={data.categories}
			submitLabel="Guardar"
			cancelHref="/"
			returnTo={page.url.pathname + page.url.search}
			repeatable
			onsaved={saved}
			onclose={close}
		/>
	{/if}
</BottomDrawer>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom));
	}
</style>
