<script lang="ts">
	import ImportItemScreen from './ImportItemScreen.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<ImportItemScreen {data} {form} />
