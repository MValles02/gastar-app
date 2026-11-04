<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import RecurringForm from '../../routes/(app)/plan/recurring/RecurringForm.svelte';
	import type { PageData } from '../../routes/(app)/plan/recurring/new/$types';
	import BottomDrawer from './BottomDrawer.svelte';

	/**
	 * "Nuevo pago o ingreso fijo" opened over the current screen (shallow route: the URL does not change
	 * and the back gesture closes it). `data` is the preloaded /plan/recurring/new load.
	 */
	let { data }: { data: PageData } = $props();

	// The drawer's history entry goes away with the back gesture, Cancelar, the scrim or Escape.
	function close() {
		if (page.state.newRule) history.back();
	}

	async function saved() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		close();
		toast.success('Guardado.');
	}
</script>

<BottomDrawer
	title={data.type === 'income' ? 'Nuevo ingreso fijo' : 'Nuevo pago fijo'}
	hideTitle
	bare
	open
	onclose={close}
>
	<RecurringForm
		variant="drawer"
		initial={data.suggested ?? {
			type: data.type,
			description: '',
			amount: '',
			accountId: data.accounts.length === 1 ? data.accounts[0].id : '',
			categoryId: '',
			dayOfMonth: ''
		}}
		accounts={data.accounts}
		categories={data.categories}
		submitLabel="Guardar"
		type={data.type}
		onsaved={saved}
		onclose={close}
	/>
</BottomDrawer>
