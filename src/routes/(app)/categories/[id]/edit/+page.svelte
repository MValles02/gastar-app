<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import CategoryForm from '../../CategoryForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Editar categoría · Gastar</title>
</svelte:head>

<PageHeader
	title="Editar categoría"
	close={{ href: resolve(`/categories/${data.id}`), label: 'Cerrar' }}
/>

<CategoryForm
	mode="edit"
	cancelHref={`/categories/${data.id}`}
	initial={form?.values ?? data.values}
	errors={form?.errors}
	disabledKinds={data.disabledKinds}
/>
