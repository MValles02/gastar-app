<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import DeleteForm from './DeleteForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Darme de baja · Gastar</title>
</svelte:head>

<PageHeader title="¿Darte de baja?" close={{ href: resolve('/profile'), label: 'Cerrar' }} />

<DeleteForm summary={data.summary} error={form?.error} />
