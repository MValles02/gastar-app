<script lang="ts">
	import { resolve } from '$app/paths';
	import { PLAN_CURRENCY } from '#lib/plan.ts';
	import { planReturn, withWizard } from '#lib/plan-wizard.ts';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import LimitForm from '../LimitForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const action = $derived(withWizard('', data.wizard));
	const back = $derived(planReturn(data.wizard ? String(data.wizard) : null));
</script>

<svelte:head>
	<title>Nuevo límite · Gastar</title>
</svelte:head>

<PageHeader title="Nuevo límite" close={{ href: resolve(back as ''), label: 'Cerrar' }} />

<LimitForm
	{action}
	cancelHref={back}
	categories={data.categories}
	initial={{
		categoryId: form?.values?.categoryId ?? '',
		amount: form?.values?.amount ?? '',
		currency: form?.values?.currency ?? PLAN_CURRENCY
	}}
	errors={form?.errors}
/>
