<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import RecurringForm from '../RecurringForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Follows the form's type toggle live.
	let type = $state(untrack(() => form?.values?.type || data.type));
	const title = $derived(type === 'income' ? 'Nuevo ingreso fijo' : 'Nuevo pago fijo');
</script>

<svelte:head>
	<title>{title} · Gastar</title>
</svelte:head>

<PageHeader {title} close={{ href: resolve('/plan'), label: 'Cerrar' }} />

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
	bind:type
/>
