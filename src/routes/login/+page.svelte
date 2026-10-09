<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AuthForm from '$lib/components/AuthForm.svelte';
	import AuthPage from '$lib/components/AuthPage.svelte';
	import AuthTabs from '$lib/components/AuthTabs.svelte';
	import CheckEmail from '$lib/components/CheckEmail.svelte';
	import ErrorText from '$lib/components/ErrorText.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let password = $state('');

	const reset = $derived(page.url.searchParams.get('reset') === '1');
</script>

<svelte:head>
	<title>Ingresar · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail email={form.checkEmail} />
{:else}
	<AuthPage>
		<AuthTabs current="login" />

		{#if reset && !form}
			<p class="note" role="status">
				<Icon name="check" size="1.25rem" />Contraseña actualizada.
			</p>
		{/if}

		<AuthForm action="?/login" submitLabel="Ingresar" onupdated={() => (password = '')}>
			<div class="field">
				<label for="email">Email</label>
				<input
					id="email"
					type="email"
					name="email"
					autocomplete="username"
					autocapitalize="none"
					value={form?.email ?? ''}
					required
				/>
			</div>

			<div class="field">
				<label for="password">Contraseña</label>
				<PasswordInput
					bind:value={password}
					autocomplete="current-password"
					invalid={!!form?.passwordError}
					describedby={form?.passwordError ? 'password-error' : undefined}
				/>
				{#if form?.passwordError}
					<ErrorText id="password-error" message={form.passwordError} />
				{/if}
			</div>

			<a class="forgot" href={resolve('/forgot-password')}>Olvidé mi contraseña</a>

			{#if form?.formError}
				<ErrorText message={form.formError} />
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
		align-self: flex-end;
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		margin-block: calc(-1 * var(--space-3)) calc(-1 * var(--space-2));
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-underline-offset: 3px;
		text-decoration-color: var(--border-strong);
	}
</style>
