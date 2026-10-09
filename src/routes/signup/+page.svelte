<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	import AuthPage from '$lib/components/AuthPage.svelte';
	import AuthTabs from '$lib/components/AuthTabs.svelte';
	import CheckEmail from '$lib/components/CheckEmail.svelte';
	import ErrorText from '$lib/components/ErrorText.svelte';
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
			<div class="field">
				<label for="name">Nombre</label>
				<input
					id="name"
					type="text"
					name="name"
					autocomplete="name"
					maxlength="80"
					value={form?.name ?? ''}
					required
					aria-invalid={form?.errors?.name ? true : undefined}
					aria-describedby={form?.errors?.name ? 'name-error' : undefined}
				/>
				{#if form?.errors?.name}
					<ErrorText id="name-error" message={form.errors.name} />
				{/if}
			</div>

			<div class="field">
				<label for="email">Email</label>
				<input
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
					<ErrorText id="email-error" message={form.errors.email} />
				{/if}
			</div>

			<div class="field">
				<label for="password">Contraseña</label>
				<PasswordInput
					bind:value={password}
					autocomplete="new-password"
					invalid={!!form?.errors?.password}
					describedby="password-hint"
				/>
				{#if form?.errors?.password}
					<ErrorText id="password-hint" message={form.errors.password} />
				{:else}
					<p class="hint" id="password-hint">Mínimo 8 caracteres.</p>
				{/if}
			</div>

			{#if form?.formError}
				<ErrorText message={form.formError} />
			{/if}
		</AuthForm>
	</AuthPage>
{/if}
