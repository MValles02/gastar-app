<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import ImportItemForm from '../../routes/(app)/imports/[id]/ImportItemForm.svelte';
	import type { PageData } from '../../routes/(app)/imports/[id]/$types';
	import BottomDrawer from './BottomDrawer.svelte';

	/**
	 * Review of one Mercado Pago item opened over the inbox (shallow route: the URL does not change and
	 * the back gesture closes it). /imports/<id> renders the same form as a page.
	 */
	let { data }: { data: PageData } = $props();

	// The drawer's history entry goes away with the back gesture, the scrim or Escape.
	function close() {
		if (page.state.importItem) history.back();
	}

	async function done(result: 'approved' | 'rejected' | 'stale') {
		await refreshAll();
		close();
		if (result === 'stale') toast.info('Ese movimiento ya fue revisado.');
		else toast.success(result === 'approved' ? 'Movimiento aprobado.' : 'Movimiento descartado.');
	}
</script>

<BottomDrawer title="Revisar movimiento" open onclose={close}>
	<ImportItemForm {data} variant="drawer" ondone={done} />
</BottomDrawer>

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
