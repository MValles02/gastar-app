<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { parseStep, planReturn } from '$lib/plan-wizard';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
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

<SheetHeader title="Nuevo límite" cancel={{ href: resolve(back as '/') }} submit={{}}>
	<LimitForm
		mode="new"
		currency={data.currency}
		{action}
		categories={data.categories}
		initial={{ categoryId: form?.values.categoryId ?? '', amount: form?.values.amount ?? '' }}
		errors={form?.errors}
	/>
</SheetHeader>
