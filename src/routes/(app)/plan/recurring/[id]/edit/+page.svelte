<script lang="ts">
	import { untrack } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import RecurringForm from '../../RecurringForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Follows the form's type toggle live.
	let type = $state(untrack(() => form?.values?.type || data.values.type));
	const title = $derived(type === 'income' ? 'Ingreso fijo' : 'Pago fijo');
</script>

<svelte:head>
	<title>{title} · Gastar</title>
</svelte:head>

<PageHeader {title} close={{ href: data.detailHref, label: 'Cerrar' }} />

<RecurringForm
	initial={form?.values ?? data.values}
	errors={form?.errors}
	accounts={data.accounts}
	categories={data.categories}
	submitLabel="Guardar cambios"
	cancelHref={data.detailHref}
	bind:type
/>
