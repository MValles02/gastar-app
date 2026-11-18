<script lang="ts">
	import { resolve } from '$app/paths';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import DeleteForm from './DeleteForm.svelte';
	import type { ActionData, PageData } from './$types';

	// "¿Darte de baja?": the /profile/delete page, or (`onclose`) the drawer opened over Perfil.
	let { data, form, onclose }: { data: PageData; form?: ActionData; onclose?: () => void } =
		$props();
</script>

<FormScreen
	title="¿Darte de baja?"
	headTitle="Darme de baja"
	close={{ href: resolve('profile') }}
	{onclose}
>
	<DeleteForm
		summary={data.summary}
		error={form?.formError}
		reauthMode={data.reauthMode}
		reauth={!!form?.reauth}
		email={data.email}
	/>
</FormScreen>
