<script lang="ts">
	import { enhance } from '$app/forms';
	import { enhanceRedirect, navigateUp } from '$lib/nav-stack.svelte';
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

<form
	method="POST"
	action="?/update"
	use:enhance={() => (input) =>
		// `update` answers success instead of redirecting.
		input.result.type === 'success'
			? navigateUp('/plan?planSaved=1', { refresh: true })
			: enhanceRedirect(input)}
	class="form"
	novalidate
>
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
