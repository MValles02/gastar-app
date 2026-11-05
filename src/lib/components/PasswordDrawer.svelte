<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import PasswordForm from '../../routes/(app)/profile/password/PasswordForm.svelte';
	import BottomDrawer from './BottomDrawer.svelte';

	/**
	 * "Cambiar contraseña" opened over Perfil (shallow route: the URL does not change and the back
	 * gesture closes it). The /profile/password page renders the same form.
	 */

	// The drawer's history entry goes away with the back gesture, Cancelar, the scrim or Escape.
	function close() {
		if (page.state.password) history.back();
	}

	async function saved() {
		await refreshAll();
		close();
		toast.success('Contraseña cambiada.');
	}
</script>

<BottomDrawer title="Cambiar contraseña" open onclose={close}>
	<PasswordForm variant="drawer" onsaved={saved} onclose={close} />
</BottomDrawer>

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
