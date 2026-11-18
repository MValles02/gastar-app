<script lang="ts">
	import { resolve } from '$app/paths';
	import { planReturn } from '#lib/plan-wizard.ts';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import LimitDetail from './LimitDetail.svelte';
	import type { PageData } from './$types';

	let { data, onclose }: { data: PageData; onclose?: () => void } = $props();

	const back = $derived(planReturn(data.wizard ? String(data.wizard) : null));
</script>

<FormScreen
	title="Límite de {data.category.name}"
	close={{ href: resolve(back as '') }}
	{onclose}
	drawerProps={{ hideTitle: true, bare: true }}
>
	<LimitDetail {data} {back} wizard={data.wizard ?? undefined} />
</FormScreen>
