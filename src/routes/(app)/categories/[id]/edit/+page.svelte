<script lang="ts">
	import { resolve } from '$app/paths';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import CategoryForm from '../../CategoryForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Editar categoría · Gastar</title>
</svelte:head>

<SheetHeader
	title="Editar categoría"
	cancel={{ href: resolve(`/categories/${data.id}`) }}
	submit={{}}
/>

<CategoryForm
	initial={form?.values ?? data.values}
	errors={form?.errors}
	disabledKinds={data.disabledKinds}
/>
