<script lang="ts">
	import { page } from '$app/state';
	import SavingsOptions from '../../routes/(app)/plan/SavingsOptions.svelte';
	import type { PageData } from '../../routes/(app)/plan/savings/$types';
	import BottomDrawer from './BottomDrawer.svelte';

	/**
	 * "Ahorro" opened over the plan (shallow route: the URL does not change and the back gesture closes
	 * it). Every pick saves on its own. `data` is the preloaded /plan/savings load.
	 */
	let { data }: { data: PageData } = $props();

	const month = new Date().toLocaleString('es-AR', {
		month: 'long',
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	// The drawer's history entry goes away with the back gesture, the scrim or Escape.
	function close() {
		if (page.state.savings) history.back();
	}
</script>

<BottomDrawer title="Ahorro de {month}" bare open onclose={close}>
	<div class="body">
		<SavingsOptions
			mode="autosave"
			income={data.income}
			currency={data.currency}
			initial={data}
			base={data.base}
			daysLeft={data.daysLeft}
		/>
	</div>
</BottomDrawer>

<style>
	.body {
		padding: 0 var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
		overflow-y: auto;
	}

	/* The modal drawer turns the page behind it pointer-events: none, toasts included. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
