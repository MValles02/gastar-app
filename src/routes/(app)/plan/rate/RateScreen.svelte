<script lang="ts">
	import { resolve } from '$app/paths';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import RateForm from './RateForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form, onclose }: { data: PageData; form?: ActionData; onclose?: () => void } =
		$props();
</script>

<FormScreen
	title="Cotización"
	close={{ href: resolve('plan') }}
	{onclose}
	onsaved={onclose && closeAfterSave(onclose, 'Cotización guardada.')}
	drawerProps={{ title: 'Cotización del plan', bare: true }}
>
	<RateForm
		initial={form?.values?.rate ?? data.amount}
		manual={data.manual}
		hasTransfer={data.hasTransfer}
		error={form?.errors?.rate}
	/>
</FormScreen>
