<script lang="ts">
	import { resolve } from '$app/paths';
	import { USER_NAME_MAX_LENGTH } from '#lib/constants.ts';
	import { PASSWORD_MIN_MESSAGE } from '#lib/fields.ts';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import AuthPage from '#lib/components/AuthPage.svelte';
	import AuthTabs from '#lib/components/AuthTabs.svelte';
	import CheckEmail from '#lib/components/CheckEmail.svelte';
	import { rememberPendingEmail } from '#lib/pending-email.ts';
	import EmailField from '#lib/components/EmailField.svelte';
	import * as Field from '#lib/components/ui/field/index.js';
	import GoogleButton from '#lib/components/GoogleButton.svelte';
	import { Input } from '#lib/components/ui/input/index.js';
	import PasswordField from '#lib/components/PasswordField.svelte';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let password = $state('');
</script>

<svelte:head>
	<title>Crear cuenta · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail
		email={form.checkEmail}
		kind="verify"
		backHref={resolve('signup')}
		onshown={() => rememberPendingEmail(form.checkEmail)}
	/>
{:else}
	<AuthPage>
		<AuthTabs current="signup" />

		{#if data.googleEnabled}
			<GoogleButton />
		{/if}

		<AuthForm action="?/signup" submitLabel="Crear cuenta">
			<Field.Field>
				<Field.Label for="name">Nombre</Field.Label>
				<Input
					id="name"
					type="text"
					name="name"
					autocomplete="name"
					maxlength={USER_NAME_MAX_LENGTH}
					value={form?.name ?? ''}
					required
					aria-invalid={form?.errors?.name ? true : undefined}
					aria-describedby={form?.errors?.name ? 'name-error' : undefined}
				/>
				{#if form?.errors?.name}
					<Field.Error id="name-error">{form.errors.name}</Field.Error>
				{/if}
			</Field.Field>

			<EmailField value={form?.email ?? ''} autocomplete="email" error={form?.errors?.email} />

			<PasswordField
				bind:value={password}
				autocomplete="new-password"
				error={form?.errors?.password}
				hint={PASSWORD_MIN_MESSAGE}
			/>

			{#if form?.formError}
				<Field.Error>{form.formError}</Field.Error>
			{/if}
		</AuthForm>
	</AuthPage>
{/if}
