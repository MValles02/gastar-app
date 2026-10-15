<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	import AuthPage from '$lib/components/AuthPage.svelte';
	import AuthTabs from '$lib/components/AuthTabs.svelte';
	import CheckEmail from '$lib/components/CheckEmail.svelte';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let password = $state('');
</script>

<svelte:head>
	<title>Crear cuenta · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail email={form.checkEmail} />
{:else}
	<AuthPage>
		<AuthTabs current="signup" />

		<AuthForm action="?/signup" submitLabel="Crear cuenta">
			<Field.Field>
				<Field.Label for="name">Nombre</Field.Label>
				<Input
					id="name"
					type="text"
					name="name"
					autocomplete="name"
					maxlength={80}
					value={form?.name ?? ''}
					required
					aria-invalid={form?.errors?.name ? true : undefined}
					aria-describedby={form?.errors?.name ? 'name-error' : undefined}
				/>
				{#if form?.errors?.name}
					<Field.Error id="name-error">{form.errors.name}</Field.Error>
				{/if}
			</Field.Field>

			<Field.Field>
				<Field.Label for="email">Email</Field.Label>
				<Input
					id="email"
					type="email"
					name="email"
					autocomplete="email"
					autocapitalize="none"
					value={form?.email ?? ''}
					required
					aria-invalid={form?.errors?.email ? true : undefined}
					aria-describedby={form?.errors?.email ? 'email-error' : undefined}
				/>
				{#if form?.errors?.email}
					<Field.Error id="email-error">{form.errors.email}</Field.Error>
				{/if}
			</Field.Field>

			<Field.Field>
				<Field.Label for="password">Contraseña</Field.Label>
				<PasswordInput
					bind:value={password}
					autocomplete="new-password"
					invalid={!!form?.errors?.password}
					describedby="password-hint"
				/>
				{#if form?.errors?.password}
					<Field.Error id="password-hint">{form.errors.password}</Field.Error>
				{:else}
					<Field.Description id="password-hint">Mínimo 8 caracteres.</Field.Description>
				{/if}
			</Field.Field>

			{#if form?.formError}
				<Field.Error>{form.formError}</Field.Error>
			{/if}
		</AuthForm>
	</AuthPage>
{/if}
