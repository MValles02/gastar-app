<script lang="ts">
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import RecurringForm from '../RecurringForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const title = $derived(data.type === 'income' ? 'Nuevo ingreso fijo' : 'Nuevo pago fijo');
</script>

<svelte:head>
	<title>{title} · Gastar</title>
</svelte:head>

<SheetHeader {title} cancel={{ href: data.returnHref }} submit={{}} />

<RecurringForm
	initial={form?.values ??
		data.suggested ?? {
			type: data.type,
			description: '',
			amount: '',
			accountId: data.accounts.length === 1 ? data.accounts[0].id : '',
			categoryId: '',
			dayOfMonth: ''
		}}
	errors={form?.errors}
	accounts={data.accounts}
	categories={data.categories}
	type={data.type}
/>
