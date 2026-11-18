<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import PasswordForm from './PasswordForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const title = $derived(
		data.reauthMode === 'password' ? 'Cambiar contraseña' : 'Crear contraseña'
	);
</script>

<svelte:head>
	<title>{title} · Gastar</title>
</svelte:head>

<PageHeader {title} close={{ href: resolve('profile'), label: 'Cerrar' }} />

<PasswordForm
	errors={form?.errors}
	formError={form?.formError}
	reauthMode={data.reauthMode}
	reauth={!!form?.reauth}
/>
