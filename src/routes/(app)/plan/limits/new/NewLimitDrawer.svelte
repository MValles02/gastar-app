<script lang="ts">
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import LimitForm from '../LimitForm.svelte';
	import type { PageData } from './$types';

	// "Nuevo límite" opened over the plan or the wizard.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();
</script>

<BottomDrawer title="Nuevo límite" bare open {onclose}>
	<LimitForm
		variant="drawer"
		categories={data.categories}
		initial={{ categoryId: '', amount: '', currency: 'ARS' }}
		onsaved={closeAfterSave(onclose)}
		{onclose}
	/>
</BottomDrawer>
