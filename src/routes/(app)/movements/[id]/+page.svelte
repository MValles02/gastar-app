<script lang="ts">
	import { resolve } from '$app/paths';
	import MovementDetail from '$lib/components/MovementDetail.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.movement.description} · Gastar</title>
</svelte:head>

<PageHeader
	title="Movimiento"
	back={{ href: resolve('/movements'), label: 'Volver a movimientos', text: 'Movimientos' }}
/>
<MovementDetail {data} variant="page" />
