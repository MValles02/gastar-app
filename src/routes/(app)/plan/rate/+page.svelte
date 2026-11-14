<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import RateForm from './RateForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Cotización · Gastar</title>
</svelte:head>

<PageHeader title="Cotización" close={{ href: resolve('/plan'), label: 'Cerrar' }} />

<RateForm
	initial={form?.values?.rate ?? data.amount}
	manual={data.rate.manual}
	hasTransfer={data.hasTransfer}
	error={form?.errors?.rate}
/>
