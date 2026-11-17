<script lang="ts">
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import PasswordForm from './PasswordForm.svelte';
	import type { PageData } from './$types';

	// "Cambiar contraseña" opened over Perfil. The /profile/password page renders the same form.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();
</script>

<BottomDrawer title={data.hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'} open {onclose}>
	<PasswordForm
		variant="drawer"
		hasPassword={data.hasPassword}
		recent={data.recent}
		onsaved={closeAfterSave(
			onclose,
			data.hasPassword ? 'Contraseña cambiada.' : 'Contraseña creada.'
		)}
		{onclose}
	/>
</BottomDrawer>
