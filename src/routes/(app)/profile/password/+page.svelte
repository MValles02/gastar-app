<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import PasswordForm from './PasswordForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Cambiar contraseña · Gastar</title>
</svelte:head>

<PageHeader title="Cambiar contraseña" close={{ href: resolve('profile'), label: 'Cerrar' }} />

<PasswordForm errors={form?.errors} formError={form?.formError} />
