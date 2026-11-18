<script lang="ts">
	import { resolve } from '$app/paths';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import MovementDetail from './MovementDetail.svelte';
	import type { PageData } from './$types';

	let { data, onclose }: { data: PageData; onclose?: () => void } = $props();
</script>

<FormScreen
	title="Movimiento"
	headTitle={data.movement.description}
	back={{ href: resolve('movements'), label: 'Volver a movimientos', text: 'Movimientos' }}
	{onclose}
	drawerProps={{ title: data.movement.description, hideTitle: true, bare: true }}
>
	<MovementDetail {data} />
</FormScreen>
