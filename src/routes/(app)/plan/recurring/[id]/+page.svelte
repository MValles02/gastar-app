<script lang="ts">
	import { resolve } from '$app/paths';
	import { planReturn } from '$lib/plan-wizard';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import RuleDetail from '$lib/components/RuleDetail.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Back to the plan, or to the wizard step the rule was opened from.
	const back = $derived(planReturn(data.wizard ? String(data.wizard) : null));
</script>

<svelte:head>
	<title>{data.description} · Gastar</title>
</svelte:head>

<PageHeader title="Plan" back={{ href: resolve(back as '/'), label: 'Volver al plan' }} />
<RuleDetail {data} />
