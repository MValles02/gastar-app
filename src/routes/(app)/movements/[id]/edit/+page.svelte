<script lang="ts">
	import { resolve } from '$app/paths';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import MovementForm from '../../MovementForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Editar movimiento · Gastar</title>
</svelte:head>

<SheetHeader
	title="Editar movimiento"
	cancel={{ href: resolve(`/movements/${data.id}`) }}
	submit={{}}
/>

<MovementForm
	initial={form?.values ?? data.values}
	errors={form?.errors}
	accounts={data.accounts}
	categories={data.categories}
/>
