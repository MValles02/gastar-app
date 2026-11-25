<script lang="ts">
	import CategoryScreen from './CategoryScreen.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<CategoryScreen {data} {form} />
