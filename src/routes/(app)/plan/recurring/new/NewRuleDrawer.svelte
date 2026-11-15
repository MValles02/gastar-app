<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import RecurringForm from '../RecurringForm.svelte';
	import type { PageData } from './$types';

	// "Nuevo pago o ingreso fijo" opened over the plan or the wizard.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();

	async function saved() {
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		onclose();
		toast.success('Guardado.');
	}
</script>

<BottomDrawer
	title={data.type === 'income' ? 'Nuevo ingreso fijo' : 'Nuevo pago fijo'}
	hideTitle
	bare
	open
	{onclose}
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
		{onclose}
	/>
</BottomDrawer>
