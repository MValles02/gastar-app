<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import AuthForm from '$lib/components/AuthForm.svelte';
	import AuthPage from '$lib/components/AuthPage.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import CheckEmail from '$lib/components/CheckEmail.svelte';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { readPendingEmail } from '$lib/pending-email';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let email = $state('');

	// The address we sent the link to, when this browser knows it: asking for a new one is one tap.
	onMount(() => {
		if (!email) email = readPendingEmail();
	});
</script>

<svelte:head>
	<title>Enlace vencido · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail email={form.checkEmail} kind="verify" backHref={resolve('/login')} />
{:else}
	<AuthPage
		backHref={resolve('/login')}
		title="Enlace vencido"
		icon="clock"
		description="El enlace para confirmar tu cuenta venció. Pedí uno nuevo."
	>
		<AuthForm action="?/resend" submitLabel="Reenviar">
			<Field.Field>
				<Field.Label for="email">Email</Field.Label>
				<Input
					id="email"
					type="email"
					name="email"
					autocomplete="username"
					autocapitalize="none"
					bind:value={email}
					required
					aria-invalid={form?.emailError ? true : undefined}
					aria-describedby={form?.emailError ? 'email-error' : undefined}
				/>
				{#if form?.emailError}
					<Field.Error id="email-error">{form.emailError}</Field.Error>
				{/if}
			</Field.Field>
			{#snippet after()}
				<Button href={resolve('/login')} variant="outline" class="w-full">Ir a Ingresar</Button>
			{/snippet}
		</AuthForm>
	</AuthPage>
{/if}
