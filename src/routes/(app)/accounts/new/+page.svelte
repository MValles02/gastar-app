<script lang="ts">
	import { resolve } from '$app/paths';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import AccountForm from '../AccountForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Nueva cuenta · Gastar</title>
</svelte:head>

<SheetHeader title="Nueva cuenta" cancel={{ href: resolve('/accounts') }} submit={{}} />

<AccountForm initial={form?.values ?? {}} errors={form?.errors} />
