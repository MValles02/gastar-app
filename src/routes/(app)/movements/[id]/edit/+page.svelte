<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import MovementForm from '../../MovementForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Editar movimiento · Gastar</title>
</svelte:head>

<PageHeader title="Editar movimiento" />

<MovementForm
	initial={form?.values ?? data.values}
	errors={form?.errors}
	accounts={data.accounts}
	categories={data.categories}
	now={data.now}
	submitLabel="Guardar cambios"
	cancelHref={`/movements/${data.id}`}
/>
