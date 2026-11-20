<script lang="ts">
	import { resolve } from '$app/paths';
	import AccountForm from '#lib/components/accounts/AccountForm.svelte';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import type { ActionData } from './$types';

	let { form, onclose }: { form?: ActionData; onclose?: () => void } = $props();
</script>

<FormScreen
	title="Nueva cuenta"
	close={{ href: resolve('accounts') }}
	{onclose}
	onsaved={onclose && closeAfterSave(onclose)}
>
	<AccountForm initial={form?.values ?? {}} errors={form?.errors} />
</FormScreen>
