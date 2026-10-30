<script lang="ts">
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import RecurringForm from '../../RecurringForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// The stored type wins: the server ignores a submitted one.
	const title = $derived(
		data.values.type === 'income' ? 'Editar ingreso fijo' : 'Editar pago fijo'
	);
</script>

<svelte:head>
	<title>{title} · Gastar</title>
</svelte:head>

<SheetHeader {title} cancel={{ href: data.detailHref }} submit={{}} />

<RecurringForm
	initial={form?.values ?? data.values}
	errors={form?.errors}
	accounts={data.accounts}
	categories={data.categories}
	type={data.values.type}
/>
