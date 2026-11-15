<script lang="ts">
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import RateForm from './RateForm.svelte';
	import type { PageData } from './$types';

	// "Cotización" opened over the plan.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();
</script>

<BottomDrawer title="Cotización del plan" bare open {onclose}>
	<RateForm
		variant="drawer"
		initial={data.amount}
		manual={data.manual}
		hasTransfer={data.hasTransfer}
		onsaved={closeAfterSave(onclose, 'Cotización guardada.')}
		{onclose}
	/>
</BottomDrawer>
