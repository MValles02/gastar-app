<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { parseStep, planReturn } from '$lib/plan-wizard';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import LimitForm from '../LimitForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const wizard = $derived(page.url.searchParams.get('wizard'));
	const action = $derived(parseStep(wizard) ? `?wizard=${parseStep(wizard)}` : '');
	const back = $derived(planReturn(wizard));
</script>

<svelte:head>
	<title>Nuevo límite · Gastar</title>
</svelte:head>

<PageHeader title="Nuevo límite" close={{ href: resolve(back as '/'), label: 'Cerrar' }} />

<LimitForm
	currency={data.currency}
	{action}
	cancelHref={back}
	categories={data.categories}
	initial={{ categoryId: form?.values?.categoryId ?? '', amount: form?.values?.amount ?? '' }}
	errors={form?.errors}
/>
