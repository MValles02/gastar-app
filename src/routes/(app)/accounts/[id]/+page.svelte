<script lang="ts">
	import AccountScreen from './AccountScreen.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<AccountScreen {data} {form} />
