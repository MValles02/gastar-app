<script lang="ts">
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import RecurringForm from '../RecurringForm.svelte';
	import type { ActionData, PageData } from './$types';

	// "Nuevo pago o ingreso fijo": the page, or (`onclose`) the drawer opened over the plan or the wizard.
	let { data, form, onclose }: { data: PageData; form?: ActionData; onclose?: () => void } =
		$props();

	const title = $derived(data.type === 'income' ? 'Nuevo ingreso fijo' : 'Nuevo pago fijo');
</script>

<FormScreen
	{title}
	close={{ href: data.returnHref }}
	{onclose}
	onsaved={onclose && closeAfterSave(onclose)}
	drawerProps={{ hideTitle: true, bare: true }}
>
	<RecurringForm
		initial={form?.values ?? data.initial}
		errors={form?.errors}
		accounts={data.accounts}
		categories={data.categories}
		type={data.type}
	/>
</FormScreen>
