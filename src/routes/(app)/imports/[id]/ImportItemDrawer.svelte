<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import ImportItemForm from './ImportItemForm.svelte';
	import type { PageData } from './$types';

	// Review of one Mercado Pago item opened over the inbox. /imports/<id> renders the same form as a page.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();

	async function done(result: 'approved' | 'rejected' | 'stale') {
		await refreshAll();
		onclose();
		if (result === 'stale') toast.info('Ese movimiento ya fue revisado.');
		else toast.success(result === 'approved' ? 'Movimiento aprobado.' : 'Movimiento descartado.');
	}
</script>

<BottomDrawer title="Revisar movimiento" open {onclose}>
	<ImportItemForm {data} variant="drawer" ondone={done} />
</BottomDrawer>
