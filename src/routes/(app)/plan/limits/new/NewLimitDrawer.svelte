<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import LimitForm from '../LimitForm.svelte';
	import type { PageData } from './$types';

	// "Nuevo límite" opened over the plan or the wizard.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();

	async function saved() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		onclose();
		toast.success('Guardado.');
	}
</script>

<BottomDrawer title="Nuevo límite" bare open {onclose}>
	<LimitForm
		variant="drawer"
		categories={data.categories}
		initial={{ categoryId: '', amount: '', currency: 'ARS' }}
		onsaved={saved}
		{onclose}
	/>
</BottomDrawer>
