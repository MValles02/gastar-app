<script lang="ts">
	import PasswordScreen from './PasswordScreen.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<PasswordScreen {data} {form} />
