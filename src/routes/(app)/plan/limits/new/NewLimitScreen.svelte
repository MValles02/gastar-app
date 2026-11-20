<script lang="ts">
	import { resolve } from '$app/paths';
	import { planReturn, withWizard } from '#lib/plan-wizard.ts';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import LimitForm from '../LimitForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form, onclose }: { data: PageData; form?: ActionData; onclose?: () => void } =
		$props();

	const back = $derived(planReturn(data.wizard ? String(data.wizard) : null));
</script>

<FormScreen
	title="Nuevo límite"
	close={{ href: resolve(back as '') }}
	{onclose}
	onsaved={onclose && closeAfterSave(onclose)}
	drawerProps={{ bare: true }}
>
	<LimitForm
		action={onclose ? undefined : withWizard('', data.wizard)}
		categories={data.categories}
		initial={form?.values ?? data.initial}
		errors={form?.errors}
	/>
</FormScreen>
