<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ALREADY_REVIEWED } from '#lib/imports.ts';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import ImportItemForm from './ImportItemForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form, onclose }: { data: PageData; form?: ActionData; onclose?: () => void } =
		$props();

	async function done(result: 'approved' | 'rejected' | 'stale') {
		await refreshAll();
		onclose?.();
		if (result === 'stale') toast.info(ALREADY_REVIEWED);
		else toast.success(result === 'approved' ? 'Movimiento aprobado.' : 'Movimiento descartado.');
	}
</script>

<FormScreen
	title="Revisar movimiento"
	back={{ href: resolve('imports'), label: 'Volver a Importados', text: 'Importados' }}
	{onclose}
>
	<ImportItemForm {data} {form} ondone={onclose ? done : undefined} />
</FormScreen>
