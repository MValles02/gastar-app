<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import LimitForm from '../../routes/(app)/plan/limits/LimitForm.svelte';
	import type { PageData } from '../../routes/(app)/plan/limits/new/$types';
	import BottomDrawer from './BottomDrawer.svelte';

	/**
	 * "Nuevo límite" opened over the plan or the wizard (shallow route: the URL does not change and the
	 * back gesture closes it). `data` is the preloaded /plan/limits/new load.
	 */
	let { data }: { data: PageData } = $props();

	// The drawer's history entry goes away with the back gesture, Cancelar, the scrim or Escape.
	function close() {
		if (page.state.newLimit) history.back();
	}

	async function saved() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		close();
		toast.success('Guardado.');
	}
</script>

<BottomDrawer title="Nuevo límite" bare open onclose={close}>
	<LimitForm
		variant="drawer"
		currency={data.currency}
		categories={data.categories}
		initial={{ categoryId: '', amount: '' }}
		onsaved={saved}
		onclose={close}
	/>
</BottomDrawer>

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
