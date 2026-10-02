<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AccountForm from '../AccountForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Nueva cuenta · Gastar</title>
</svelte:head>

<PageHeader title="Nueva cuenta" />

<AccountForm
	mode="create"
	cancelHref="/accounts"
	initial={form?.values ?? {
		name: '',
		currency: 'ARS',
		initialBalance: '',
		icon: 'wallet',
		color: 'green'
	}}
	errors={form?.errors}
/>
