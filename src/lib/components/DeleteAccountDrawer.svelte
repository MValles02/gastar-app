<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { page } from '$app/state';
	import DeleteForm from '../../routes/(app)/profile/delete/DeleteForm.svelte';
	import BottomDrawer from './BottomDrawer.svelte';

	type Summary = ComponentProps<typeof DeleteForm>['summary'];
	let { summary }: { summary: Summary } = $props();

	/**
	 * "¿Darte de baja?" opened over Perfil (shallow route: the URL does not change and the back gesture
	 * closes it). The /profile/delete page renders the same form.
	 */

	// The drawer's history entry goes away with the back gesture, Cancelar, the scrim or Escape.
	function close() {
		if (page.state.deleteAccount) history.back();
	}
</script>

<BottomDrawer title="¿Darte de baja?" open onclose={close}>
	<DeleteForm variant="drawer" {summary} onclose={close} />
</BottomDrawer>

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
