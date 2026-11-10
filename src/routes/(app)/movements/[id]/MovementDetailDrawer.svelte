<script lang="ts">
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import MovementDetail from './MovementDetail.svelte';
	import type { PageData } from './$types';

	// A movement's detail and edit opened over the list, so scroll and filters survive.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();
</script>

<BottomDrawer title={data.movement.description} hideTitle bare open {onclose}>
	<MovementDetail {data} variant="drawer" {onclose} />
</BottomDrawer>
