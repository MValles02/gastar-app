<script lang="ts">
	import { resolve } from '$app/paths';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import PasswordForm from './PasswordForm.svelte';
	import type { ActionData, PageData } from './$types';

	// "Cambiar contraseña": the /profile/password page, or (`onclose`) the drawer opened over Perfil.
	let { data, form, onclose }: { data: PageData; form?: ActionData; onclose?: () => void } =
		$props();

	const changing = $derived(data.reauthMode === 'password');
</script>

<FormScreen
	title={changing ? 'Cambiar contraseña' : 'Crear contraseña'}
	close={{ href: resolve('profile') }}
	{onclose}
	onsaved={onclose &&
		closeAfterSave(onclose, changing ? 'Contraseña cambiada.' : 'Contraseña creada.')}
>
	<PasswordForm
		errors={form?.errors}
		formError={form?.formError}
		reauthMode={data.reauthMode}
		reauth={!!form?.reauth}
	/>
</FormScreen>
