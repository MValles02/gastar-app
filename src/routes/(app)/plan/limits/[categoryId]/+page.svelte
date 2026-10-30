<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { parseStep, planReturn } from '$lib/plan-wizard';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import LimitForm from '../LimitForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const step = $derived(parseStep(page.url.searchParams.get('wizard')));
	const back = $derived(planReturn(page.url.searchParams.get('wizard')));
	const wizardQuery = $derived(step ? `&wizard=${step}` : '');
</script>

<svelte:head>
	<title>Límite de {data.category.name} · Gastar</title>
</svelte:head>

<SheetHeader
	title="Límite de {data.category.name}"
	cancel={{ href: resolve(back as '/') }}
	submit={{}}
>
	<LimitForm
		mode="edit"
		currency={data.currency}
		action="?/save{wizardQuery}"
		category={data.category}
		suggested={data.suggested}
		initial={{ categoryId: data.category.id, amount: form?.amount ?? data.amount }}
		errors={{ amount: form?.error }}
		deleteAction="?/delete{wizardQuery}"
		progress={data.progress}
	/>
</SheetHeader>
