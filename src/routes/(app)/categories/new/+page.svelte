<script lang="ts">
	import NewCategoryScreen from './NewCategoryScreen.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<NewCategoryScreen {form} />
