<script lang="ts">
	import { resolve } from '$app/paths';
	import AuthForm from '$lib/components/AuthForm.svelte';
	import AuthPage from '$lib/components/AuthPage.svelte';
	import CheckEmail from '$lib/components/CheckEmail.svelte';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	// Never read the email from the URL: it would land in access logs and history.
	const initialEmail = $derived(form?.email ?? '');
</script>

<svelte:head>
	<title>Recuperar contraseña · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail email={form.checkEmail} />
{:else}
	<AuthPage>
		<a class="back" href={resolve('/login')}>
			<Icon name="chevron-left" size="1.25rem" /><span class="visually-hidden"
				>Volver a Ingresar</span
			>
		</a>
		<h1>Recuperar contraseña</h1>

		<AuthForm action="?/request" submitLabel="Enviar enlace">
			<Field.Field>
				<Field.Label for="email">Email</Field.Label>
				<Input
					id="email"
					type="email"
					name="email"
					autocomplete="username"
					autocapitalize="none"
					value={initialEmail}
					required
					aria-invalid={form?.emailError ? true : undefined}
					aria-describedby={form?.emailError ? 'email-error' : undefined}
				/>
				{#if form?.emailError}
					<Field.Error id="email-error">{form.emailError}</Field.Error>
				{/if}
			</Field.Field>
		</AuthForm>
	</AuthPage>
{/if}

<style>
	.back {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		margin-left: calc(-1 * var(--space-3));
		color: var(--text);
	}

	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.875rem;
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.01em;
	}
</style>
