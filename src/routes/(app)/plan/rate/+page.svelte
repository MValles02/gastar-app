<script lang="ts">
	import RateScreen from './RateScreen.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<RateScreen {data} {form} />
