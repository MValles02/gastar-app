<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import MovementForm from '../../routes/(app)/movements/MovementForm.svelte';
	import type { PageData } from '../../routes/(app)/movements/new/$types';
	import BottomDrawer from './BottomDrawer.svelte';

	/**
	 * "Registrar <pago o ingreso fijo>" opened from the rule's detail (shallow route: the URL does not
	 * change and the back gesture closes it). `data` is the preloaded /movements/new?recurring=<id> load.
	 */
	let { data }: { data: PageData } = $props();

	// The drawer's history entry goes away with the back gesture, Cancelar, the scrim or Escape.
	function close() {
		if (page.state.registerRule) history.back();
	}

	// A rule registration redirects to /plan?saved=1 (no movement id), so there is no Deshacer.
	async function saved() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		close();
		toast.success('Pago registrado.');
	}
</script>

{#if data.recurring}
	<BottomDrawer title="Registrar {data.recurring.description}" bare open onclose={close}>
		<MovementForm
			variant="drawer"
			initial={data.recurring.initial}
			accounts={data.accounts}
			categories={data.categories}
			submitLabel={data.recurring.type === 'income' ? 'Registrar ingreso' : 'Registrar pago'}
			cancelHref="/plan"
			returnTo={page.url.pathname + page.url.search}
			recurring={data.recurring}
			onsaved={saved}
			onclose={close}
		/>
	</BottomDrawer>
{/if}

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
