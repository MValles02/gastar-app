<script lang="ts">
	import { currentMonthName } from '$lib/locale';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import SavingsOptions from '../SavingsOptions.svelte';
	import type { PageData } from './$types';

	// "Ahorro" opened over the plan. Every pick saves on its own.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();

	const month = currentMonthName();
</script>

<BottomDrawer title="Ahorro de {month}" bare open {onclose}>
	<div class="body">
		<SavingsOptions
			mode="autosave"
			income={data.income}
			currency={data.currency}
			initial={data}
			base={data.base}
			daysLeft={data.daysLeft}
		/>
	</div>
</BottomDrawer>

<style>
	.body {
		padding: 0 var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
		overflow-y: auto;
	}
</style>
