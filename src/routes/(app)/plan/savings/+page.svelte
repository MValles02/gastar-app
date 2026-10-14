<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import FormActions from '$lib/components/FormActions.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SavingsFields from '../SavingsFields.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Ahorro · Gastar</title>
</svelte:head>

<PageHeader title="Ahorro" close={{ href: resolve('/plan'), label: 'Cerrar' }} />

<form method="POST" use:enhance class="form" novalidate>
	<SavingsFields
		income={data.income}
		currency={data.currency}
		initial={data}
		error={form?.message}
	/>
	<FormActions cancelHref="/plan" submitLabel="Guardar" />
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}
</style>
