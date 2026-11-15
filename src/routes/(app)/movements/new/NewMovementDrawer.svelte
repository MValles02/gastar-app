<script lang="ts">
	import { invalidateAll, refreshAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { highlightMovement } from '#lib/highlight.svelte.ts';
	import { isModifiedClick, openShallow } from '#lib/open-shallow.ts';
	import { undoMovementSaved } from '#lib/undo-toast.ts';
	import AccountForm from '#lib/components/accounts/AccountForm.svelte';
	import MovementForm from '../MovementForm.svelte';
	import type { PageData } from './$types';

	// "Nuevo movimiento" opened from the + button over the current screen.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();

	// No accounts yet: "Nueva cuenta" opens as a nested drawer over this one. Modified clicks follow the link.
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
		onclose();
		highlightMovement(id);
	}
</script>

<BottomDrawer title="Nuevo movimiento" hideTitle bare open {onclose}>
	{#if data.accounts.length === 0}
		<div class="empty">
			<p>Necesitás al menos una cuenta para registrar movimientos.</p>
			<Button href={resolve('accounts/new')} onclick={createAccount}>Crear cuenta</Button>
		</div>
	{:else}
		<MovementForm
			variant="drawer"
			initial={data.values}
			accounts={data.accounts}
			categories={data.categories}
			submitLabel="Guardar"
			cancelHref="/"
			returnTo={page.url.pathname + page.url.search}
			repeatable
			onsaved={saved}
			{onclose}
		/>
	{/if}
	<BottomDrawer title="Nueva cuenta" nested bind:open={accountOpen}>
		<AccountForm
			variant="drawer"
			initial={{}}
			onsaved={accountSaved}
			onclose={() => (accountOpen = false)}
		/>
	</BottomDrawer>
</BottomDrawer>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom));
	}
</style>
