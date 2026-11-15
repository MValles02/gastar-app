<script lang="ts">
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import RecurringForm from '../RecurringForm.svelte';
	import type { PageData } from './$types';

	// "Nuevo pago o ingreso fijo" opened over the plan or the wizard.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();
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
		onsaved={closeAfterSave(onclose)}
		{onclose}
	/>
</BottomDrawer>
