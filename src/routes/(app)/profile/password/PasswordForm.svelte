<script lang="ts">
	import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '#lib/constants.ts';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import GoogleReauth, { needsGoogleReauth } from '#lib/components/GoogleReauth.svelte';
	import Field from '#lib/components/base/Field.svelte';
	import type { ReauthMode } from '#lib/server/reauth.ts';

	type Errors = { current?: string; next?: string };

	/**
	 * The change-password form. `drawer`: the "Cambiar contraseña" drawer (posts to /profile/password
	 * and reports the result instead of navigating). `page`: the /profile/password page.
	 */
	let {
		errors = {},
		formError,
		reauthMode = 'password',
		reauth = false
	}: {
		errors?: Errors;
		formError?: string;
		/** 'password': changes it. Otherwise a Google-only user, who creates a password (no current one to ask for; 'recent': the session is recent enough). */
		reauthMode?: ReauthMode;
		/** The last post asked to confirm with Google. */
		reauth?: boolean;
	} = $props();

	let current = $state('');
	let next = $state('');
	// Errors from the drawer's post; the page shows the server-rendered ones instead.
	let posted = $state<{ errors: Errors; formError?: string; reauth?: boolean }>({ errors: {} });
	const shown = $derived({ ...errors, ...posted.errors });
	const message = $derived(posted.formError ?? formError);
	const hasPassword = $derived(reauthMode === 'password');
	const needsGoogle = $derived(needsGoogleReauth(reauthMode, !!posted.reauth || reauth));
</script>

{#if needsGoogle}
	<div class="reauth">
		<GoogleReauth action="/profile/password?/google" {message}>
			<p>Por seguridad, confirmá que sos vos entrando de nuevo con Google.</p>
		</GoogleReauth>
	</div>
{:else}
	<FormShell
		action="/profile/password?/save"
		onfailure={(data: { errors?: Errors; formError?: string; reauth?: boolean }) =>
			(posted = { errors: data.errors ?? {}, formError: data.formError, reauth: data.reauth })}
		cancelHref="/profile"
		canSave={(!hasPassword || !!current) && !!next}
		style="--form-gap: 0.875rem; --actions-mt: var(--space-2)"
	>
		{#if hasPassword}
			<Field
				id="current-password"
				name="currentPassword"
				label="Contraseña actual"
				type="password"
				bind:value={current}
				autocomplete="current-password"
				maxlength={PASSWORD_MAX_LENGTH}
				error={shown.current}
				errorId="current-error"
			/>
		{/if}
		<Field
			id="new-password"
			name="newPassword"
			label="Contraseña nueva"
			type="password"
			bind:value={next}
			autocomplete="new-password"
			minlength={PASSWORD_MIN_LENGTH}
			maxlength={PASSWORD_MAX_LENGTH}
			error={shown.next}
			errorId="next-error"
		/>
		<p class="hint">
			Mínimo {PASSWORD_MIN_LENGTH} caracteres.{hasPassword ? ' Cerramos tus otras sesiones.' : ''}
		</p>
		{#if message}<p class="error" role="alert">{message}</p>{/if}
	</FormShell>
{/if}

<style>
	.reauth {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-1) var(--space-4) var(--space-4);
	}

	.hint {
		color: var(--text-muted);
		font-size: 0.8125rem;
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
