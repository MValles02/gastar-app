<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import AccountForm from '../AccountForm.svelte';

	// "Nueva cuenta" opened over the Cuentas list. The /accounts/new page renders the same form.
	let { onclose }: { onclose: () => void } = $props();

	async function saved() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		onclose();
		toast.success('Guardado.');
	}
</script>

<BottomDrawer title="Nueva cuenta" open {onclose}>
	<AccountForm variant="drawer" initial={{}} onsaved={saved} {onclose} />
</BottomDrawer>
