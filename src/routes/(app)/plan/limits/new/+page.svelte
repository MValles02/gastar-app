<script lang="ts">
	import NewLimitScreen from './NewLimitScreen.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<NewLimitScreen {data} {form} />
