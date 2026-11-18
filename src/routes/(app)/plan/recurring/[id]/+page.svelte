<script lang="ts">
	import { resolve } from '$app/paths';
	import { planReturn } from '#lib/plan-wizard.ts';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import RuleDetail from './RuleDetail.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const back = $derived(planReturn(data.wizard ? String(data.wizard) : null));
</script>

<svelte:head>
	<title>{data.description} · Gastar</title>
</svelte:head>

<PageHeader
	title="Plan"
	back={{ href: resolve(back as ''), label: 'Volver al plan', text: 'Plan' }}
/>
<RuleDetail {data} />
