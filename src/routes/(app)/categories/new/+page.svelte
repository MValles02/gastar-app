<script lang="ts">
	import { resolve } from '$app/paths';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import CategoryForm from '../CategoryForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Nueva categoría · Gastar</title>
</svelte:head>

<SheetHeader title="Nueva categoría" cancel={{ href: resolve('/categories') }} submit={{}}>
	<CategoryForm initial={form?.values ?? {}} errors={form?.errors} />
</SheetHeader>
