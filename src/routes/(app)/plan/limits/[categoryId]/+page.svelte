<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { parseStep, planReturn } from '$lib/plan-wizard';
	import LimitDetail from '$lib/components/LimitDetail.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const step = $derived(parseStep(page.url.searchParams.get('wizard')));
	const back = $derived(planReturn(page.url.searchParams.get('wizard')));
</script>

<svelte:head>
	<title>Límite de {data.category.name} · Gastar</title>
</svelte:head>

<PageHeader
	title="Límite de {data.category.name}"
	close={{ href: resolve(back as '/'), label: 'Cerrar' }}
/>

<LimitDetail {data} variant="page" {back} wizard={step ?? undefined} />
