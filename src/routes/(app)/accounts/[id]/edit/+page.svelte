<script lang="ts">
	import { resolve } from '$app/paths';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import AccountForm from '../../AccountForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Editar cuenta · Gastar</title>
</svelte:head>

<SheetHeader title="Editar cuenta" cancel={{ href: resolve(`/accounts/${data.id}`) }} submit={{}} />

<AccountForm
	currencyLocked={data.currencyLocked}
	initial={form?.values ?? data.values}
	errors={form?.errors}
/>
