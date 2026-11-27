<script lang="ts">
	import { resolve } from '$app/paths';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import AuthPage from '#lib/components/AuthPage.svelte';
	import CheckEmail from '#lib/components/CheckEmail.svelte';
	import Field from '#lib/components/base/Field.svelte';
	import { es } from '#lib/copy/es.ts';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	// Never read the email from the URL: it would land in access logs and history.
	const initialEmail = $derived(form?.email ?? '');
</script>

<svelte:head>
	<title>Recuperar contraseña · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail email={form.checkEmail} kind="reset" backHref={resolve('forgot-password')} />
{:else}
	<AuthPage
		backHref={resolve('login')}
		title="Recuperar contraseña"
		description="Te mandamos un enlace por email."
	>
		<AuthForm action="?/request" submitLabel="Enviar enlace">
			<Field
				id="email"
				name="email"
				label={es.auth.fields.email}
				type="email"
				autocapitalize="none"
				required
				autocomplete="username"
				value={initialEmail}
				error={form?.emailError}
			/>
		</AuthForm>
	</AuthPage>
{/if}
