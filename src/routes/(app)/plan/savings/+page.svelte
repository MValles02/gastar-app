<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import { upOnClick } from '#lib/nav-stack.svelte.ts';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SavingsOptions from '../SavingsOptions.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Ahorro · Gastar</title>
</svelte:head>

<PageHeader title="Ahorro" close={{ href: resolve('plan'), label: 'Cerrar' }} />

<div class="page">
	<SavingsOptions
		mode="autosave"
		income={data.income}
		initial={data}
		base={data.base}
		daysLeft={data.daysLeft}
	/>
	<Button href={resolve('plan')} onclick={upOnClick(resolve('plan'))} class="w-full">Listo</Button>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}
</style>
