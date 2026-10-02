<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import CategoryForm from '../CategoryForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Nueva categoría · Gastar</title>
</svelte:head>

<PageHeader title="Nueva categoría" />

<CategoryForm
	mode="create"
	cancelHref="/categories"
	initial={form?.values ?? { name: '', color: 'green' }}
	errors={form?.errors}
/>
