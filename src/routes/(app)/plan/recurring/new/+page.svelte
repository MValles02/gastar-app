<script lang="ts">
	import NewRuleScreen from './NewRuleScreen.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<NewRuleScreen {data} {form} />
