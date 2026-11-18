<script lang="ts">
	import MovementScreen from './MovementScreen.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<MovementScreen {data} />
