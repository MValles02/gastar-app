<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import AccountForm from '#lib/components/accounts/AccountForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Nueva cuenta · Gastar</title>
</svelte:head>

<PageHeader title="Nueva cuenta" close={{ href: resolve('accounts'), label: 'Cerrar' }} />

<AccountForm initial={form?.values ?? {}} errors={form?.errors} />
