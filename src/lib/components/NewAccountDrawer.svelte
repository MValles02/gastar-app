<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import AccountForm from '../../routes/(app)/accounts/AccountForm.svelte';
	import BottomDrawer from './BottomDrawer.svelte';

	/**
	 * "Nueva cuenta" opened over the Cuentas list (shallow route: the URL does not change and the back
	 * gesture closes it). The /accounts/new page renders the same form.
	 */

	// The drawer's history entry goes away with the back gesture, Cancelar, the scrim or Escape.
	function close() {
		if (page.state.newAccount) history.back();
	}

	async function saved() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		close();
		toast.success('Guardado.');
	}
</script>

<BottomDrawer title="Nueva cuenta" open onclose={close}>
	<AccountForm variant="drawer" initial={{}} onsaved={saved} onclose={close} />
</BottomDrawer>

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
