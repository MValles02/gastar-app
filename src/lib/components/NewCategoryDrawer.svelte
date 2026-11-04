<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import CategoryCreateDrawer from './CategoryCreateDrawer.svelte';

	/**
	 * "Nueva categoría" opened over the Categorías list (shallow route: the URL does not change and the
	 * back gesture closes it). The /categories/new page renders the same form.
	 */

	// The drawer's history entry goes away with the back gesture, Cancelar, the scrim or Escape.
	function close() {
		if (page.state.newCategory) history.back();
	}

	async function created() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		close();
		toast.success('Guardado.');
	}
</script>

<CategoryCreateDrawer
	open
	nested={false}
	defaultKind="outcome"
	oncreated={created}
	onclose={close}
/>

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
