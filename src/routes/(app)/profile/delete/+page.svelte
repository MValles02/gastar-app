<script lang="ts">
	import DeleteAccountScreen from './DeleteAccountScreen.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<DeleteAccountScreen {data} {form} />
