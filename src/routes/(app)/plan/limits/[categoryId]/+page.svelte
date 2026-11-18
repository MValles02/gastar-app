<script lang="ts">
	import LimitScreen from './LimitScreen.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<LimitScreen {data} />
