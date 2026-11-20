<script lang="ts">
	import { resolve } from '$app/paths';
	import { currentMonthName } from '#lib/locale.ts';
	import { upOnClick } from '#lib/nav-stack.svelte.ts';
	import { PLAN_CURRENCY } from '#lib/plan.ts';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import SavingsOptions from '../SavingsOptions.svelte';
	import type { PageData } from './$types';

	let { data, onclose }: { data: PageData; onclose?: () => void } = $props();
</script>

{#snippet options()}
	<SavingsOptions
		mode="autosave"
		path="/plan/savings?/update"
		currency={PLAN_CURRENCY}
		income={data.income}
		initial={data}
		base={data.base}
		daysLeft={data.daysLeft}
	/>
{/snippet}

<FormScreen
	title="Ahorro"
	close={{ href: resolve('plan') }}
	{onclose}
	drawerProps={{ title: `Ahorro de ${currentMonthName()}`, bare: true }}
>
	{#if onclose}
		<div class="body">
			{@render options()}
		</div>
	{:else}
		<div class="page">
			{@render options()}
			<Button href={resolve('plan')} onclick={upOnClick(resolve('plan'))} class="w-full"
				>Listo</Button
			>
		</div>
	{/if}
</FormScreen>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.body {
		padding: 0 var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
		overflow-y: auto;
	}
</style>
