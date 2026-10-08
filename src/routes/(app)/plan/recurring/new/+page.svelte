<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import RecurringForm from '../RecurringForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Nuevo fijo · Gastar</title>
</svelte:head>

<PageHeader title="Nuevo fijo" close={{ href: resolve('/plan'), label: 'Cerrar' }} />

<RecurringForm
	initial={form?.values ?? {
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
	submitLabel="Guardar"
/>
