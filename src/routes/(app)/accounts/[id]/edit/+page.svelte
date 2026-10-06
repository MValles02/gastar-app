<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AccountForm from '../../AccountForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Editar cuenta · Gastar</title>
</svelte:head>

<PageHeader
	title="Editar cuenta"
	back={{ href: resolve(`/accounts/${data.id}`), label: 'Volver a la cuenta' }}
/>

<AccountForm
	mode="edit"
	currencyLocked={data.currencyLocked}
	cancelHref={`/accounts/${data.id}`}
	initial={form?.values ?? data.values}
	errors={form?.errors}
/>
