<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import MovementForm from '../MovementForm.svelte';
	import type { PageData } from './$types';

	// "Registrar <pago o ingreso fijo>" opened from the rule's detail (/movements/new?recurring=<id>).
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();

	// A rule registration redirects to /plan?saved=1 (no movement id), so there is no Deshacer.
	async function saved() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		onclose();
		toast.success('Pago registrado.');
	}
</script>

{#if data.recurring}
	<BottomDrawer title="Registrar {data.recurring.description}" bare open {onclose}>
		<MovementForm
			variant="drawer"
			initial={data.recurring.initial}
			accounts={data.accounts}
			categories={data.categories}
			submitLabel={data.recurring.type === 'income' ? 'Registrar ingreso' : 'Registrar pago'}
			cancelHref="/plan"
			returnTo={page.url.pathname + page.url.search}
			recurring={data.recurring}
			onsaved={saved}
			{onclose}
		/>
	</BottomDrawer>
{/if}
