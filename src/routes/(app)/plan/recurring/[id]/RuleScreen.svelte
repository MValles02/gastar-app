<script lang="ts">
	import { resolve } from '$app/paths';
	import { planReturn } from '#lib/plan-wizard.ts';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import RuleDetail from './RuleDetail.svelte';
	import type { PageData } from './$types';

	let { data, onclose }: { data: PageData; onclose?: () => void } = $props();

	const back = $derived(planReturn(data.wizard ? String(data.wizard) : null));
</script>

<FormScreen
	title="Plan"
	headTitle={data.description}
	back={{ href: resolve(back as ''), label: 'Volver al plan' }}
	{onclose}
	drawerProps={{ title: data.description, hideTitle: true }}
>
	<RuleDetail {data} />
</FormScreen>
