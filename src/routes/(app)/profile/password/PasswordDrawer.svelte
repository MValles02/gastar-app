<script lang="ts">
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import PasswordForm from './PasswordForm.svelte';

	// "Cambiar contraseña" opened over Perfil. The /profile/password page renders the same form.
	let { onclose }: { onclose: () => void } = $props();
</script>

<BottomDrawer title="Cambiar contraseña" open {onclose}>
	<PasswordForm
		variant="drawer"
		onsaved={closeAfterSave(onclose, 'Contraseña cambiada.')}
		{onclose}
	/>
</BottomDrawer>
