<script lang="ts">
	import SavingsScreen from './SavingsScreen.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SavingsScreen {data} />
