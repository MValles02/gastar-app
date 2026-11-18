<script lang="ts">
	import NewAccountScreen from './NewAccountScreen.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<NewAccountScreen {form} />
