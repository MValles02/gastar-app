<script lang="ts">
	import { resolve } from '$app/paths';
	import { planReturn } from '#lib/plan-wizard.ts';
	import LimitDetail from './LimitDetail.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const back = $derived(planReturn(data.wizard ? String(data.wizard) : null));
</script>

<svelte:head>
	<title>Límite de {data.category.name} · Gastar</title>
</svelte:head>

<PageHeader
	title="Límite de {data.category.name}"
	close={{ href: resolve(back as ''), label: 'Cerrar' }}
/>

<LimitDetail {data} variant="page" {back} wizard={data.wizard ?? undefined} />
