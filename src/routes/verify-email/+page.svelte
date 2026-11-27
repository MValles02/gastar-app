<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import AuthPage from '#lib/components/AuthPage.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import CheckEmail from '#lib/components/CheckEmail.svelte';
	import Field from '#lib/components/base/Field.svelte';
	import { es } from '#lib/copy/es.ts';
	import { readPendingEmail, rememberPendingEmail } from '#lib/pending-email.ts';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	// A rejected resend (no JS) comes back with the typed address.
	let email = $derived(form?.email ?? '');

	// The address we sent the link to, when this browser knows it: asking for a new one is one tap.
	onMount(() => {
		if (!email) email = readPendingEmail();
	});
</script>

<svelte:head>
	<title>Enlace vencido · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail
		email={form.checkEmail}
		kind="verify"
		backHref={resolve('login')}
		onshown={() => rememberPendingEmail(form.checkEmail)}
	/>
{:else}
	<AuthPage
		backHref={resolve('login')}
		title="Enlace vencido"
		icon="clock"
		description="El enlace para confirmar tu cuenta venció. Pedí uno nuevo."
	>
		<AuthForm action="?/resend" submitLabel="Reenviar">
			<Field
				id="email"
				name="email"
				label={es.auth.fields.email}
				type="email"
				autocapitalize="none"
				required
				autocomplete="username"
				bind:value={email}
				error={form?.emailError}
			/>
			{#snippet after()}
				<Button href={resolve('login')} variant="outline" class="w-full">Ir a Ingresar</Button>
			{/snippet}
		</AuthForm>
	</AuthPage>
{/if}
