<script lang="ts">
	import NewMovementScreen from './NewMovementScreen.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<NewMovementScreen {data} {form} />
