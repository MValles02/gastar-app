<script lang="ts">
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import AccountForm from '#lib/components/accounts/AccountForm.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';

	// "Nueva cuenta" opened over the Cuentas list. The /accounts/new page renders the same form.
	let { onclose }: { onclose: () => void } = $props();
</script>

<BottomDrawer title="Nueva cuenta" open {onclose}>
	<AccountForm variant="drawer" initial={{}} onsaved={closeAfterSave(onclose)} {onclose} />
</BottomDrawer>
