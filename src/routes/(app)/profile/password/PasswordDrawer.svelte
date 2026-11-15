<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import PasswordForm from './PasswordForm.svelte';

	// "Cambiar contraseña" opened over Perfil. The /profile/password page renders the same form.
	let { onclose }: { onclose: () => void } = $props();

	async function saved() {
		await refreshAll();
		onclose();
		toast.success('Contraseña cambiada.');
	}
</script>

<BottomDrawer title="Cambiar contraseña" open {onclose}>
	<PasswordForm variant="drawer" onsaved={saved} {onclose} />
</BottomDrawer>
