<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import AuthPage from '#lib/components/AuthPage.svelte';
	import AuthTabs from '#lib/components/AuthTabs.svelte';
	import CheckEmail from '#lib/components/CheckEmail.svelte';
	import { rememberPendingEmail } from '#lib/pending-email.ts';
	import EmailField from '#lib/components/EmailField.svelte';
	import * as Field from '#lib/components/ui/field/index.js';
	import GoogleButton from '#lib/components/GoogleButton.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PasswordField from '#lib/components/PasswordField.svelte';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let password = $state('');

	const reset = $derived(page.url.searchParams.get('reset') === '1');

	// Better Auth's `?error=<code>` after a Google sign-in; the raw code is never shown.
	const googleError = $derived.by(() => {
		const code = page.url.searchParams.get('error');
		if (!code) return undefined;
		if (code === 'account_not_linked')
			return 'Ya hay una cuenta con ese email sin verificar. Entrá con tu contraseña y verificá el email.';
		if (code === 'access_denied') return 'Cancelaste el ingreso con Google.';
		return 'No pudimos entrar con Google. Probá de nuevo.';
	});
</script>

<svelte:head>
	<title>Ingresar · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail
		email={form.checkEmail}
		kind="verify"
		backHref={resolve('login')}
		onshown={() => rememberPendingEmail(form.checkEmail)}
	/>
{:else}
	<AuthPage>
		<AuthTabs current="login" />

		{#if reset && !form}
			<p class="note" role="status">
				<Icon name="check" size="1.25rem" />Contraseña actualizada.
			</p>
		{/if}

		{#if googleError && !form}
			<Field.Error>{googleError}</Field.Error>
		{/if}

		{#if data.googleEnabled}
			<GoogleButton />
		{/if}

		<AuthForm action="?/login" submitLabel="Ingresar" onupdated={() => (password = '')}>
			<EmailField
				value={form?.email ?? ''}
				ariaWiring={false}
				describedby={form?.passwordError ? 'password-error' : undefined}
			/>

			<PasswordField
				bind:value={password}
				autocomplete="current-password"
				error={form?.passwordError}
			/>

			<a class="forgot" href={resolve('forgot-password')}>Olvidé mi contraseña</a>

			{#if form?.formError}
				<Field.Error>{form.formError}</Field.Error>
			{/if}
		</AuthForm>
	</AuthPage>
{/if}

<style>
	.note {
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius);
		background: var(--muted);
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.forgot {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		margin-block: calc(-1 * var(--space-3)) calc(-1 * var(--space-2));
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--link);
		text-decoration: none;
	}
</style>
