<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ImportItemForm from './ImportItemForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Revisar movimiento · Gastar</title>
</svelte:head>

<PageHeader
	title="Revisar movimiento"
	back={{ href: resolve('/imports'), label: 'Volver a Mercado Pago', text: 'Mercado Pago' }}
/>

<ImportItemForm {data} {form} variant="page" />
