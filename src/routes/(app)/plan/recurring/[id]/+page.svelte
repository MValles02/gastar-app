<script lang="ts">
	import RuleScreen from './RuleScreen.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<RuleScreen {data} />
