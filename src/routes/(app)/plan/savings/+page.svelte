<script lang="ts">
	import { enhance } from '$app/forms';
	import { enhanceRedirect } from '$lib/nav-stack.svelte';
	import { resolve } from '$app/paths';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import { SHEET_FORM } from '$lib/sheet.svelte';
	import SavingsFields from '../SavingsFields.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Ahorro · Gastar</title>
</svelte:head>

<SheetHeader title="Ahorro" cancel={{ href: resolve('/plan') }} submit={{}}>
	<form id={SHEET_FORM} method="POST" use:enhance={() => enhanceRedirect} class="form" novalidate>
		<SavingsFields
			income={data.income}
			currency={data.currency}
			initial={data}
			error={form?.message}
		/>
	</form>
</SheetHeader>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}
</style>
