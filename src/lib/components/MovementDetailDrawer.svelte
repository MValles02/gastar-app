<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from '../../routes/(app)/movements/[id]/$types';
	import BottomDrawer from './BottomDrawer.svelte';
	import MovementDetail from './MovementDetail.svelte';

	/**
	 * A movement's detail and edit opened over the list (shallow route: the URL does not change, so scroll
	 * and filters survive, and the back gesture closes it). `data` is the preloaded /movements/<id> load.
	 */
	let { data }: { data: PageData } = $props();

	// The drawer's history entry goes away with the back gesture, Listo, the scrim or Escape.
	function close() {
		if (page.state.movement) history.back();
	}
</script>

<BottomDrawer title={data.movement.description} hideTitle bare open onclose={close}>
	<MovementDetail {data} variant="drawer" onclose={close} />
</BottomDrawer>

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included: keep Deshacer clickable. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
