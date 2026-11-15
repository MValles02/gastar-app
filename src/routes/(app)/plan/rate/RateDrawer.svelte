<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import RateForm from './RateForm.svelte';
	import type { PageData } from './$types';

	// "Cotización" opened over the plan.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();

	async function saved() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		onclose();
		toast.success('Cotización guardada.');
	}
</script>

<BottomDrawer title="Cotización del plan" bare open {onclose}>
	<RateForm
		variant="drawer"
		initial={data.amount}
		manual={data.rate.manual}
		hasTransfer={data.hasTransfer}
		onsaved={saved}
		{onclose}
	/>
</BottomDrawer>
