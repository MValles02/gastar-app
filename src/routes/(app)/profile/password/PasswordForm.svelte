<script lang="ts">
	import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '#lib/fields.ts';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import PasswordInput from '#lib/components/PasswordInput.svelte';

	type Errors = { current?: string; next?: string };

	/**
	 * The change-password form. `drawer`: the "Cambiar contraseña" drawer (posts to /profile/password
	 * and reports the result instead of navigating). `page`: the /profile/password page.
	 */
	let {
		errors = {},
		formError,
		hasPassword = true,
		recent = true,
		reauth = false,
		variant = 'page',
		onsaved,
		onclose
	}: {
		errors?: Errors;
		formError?: string;
		/** false: a Google-only user, who creates a password (no current one to ask for). */
		hasPassword?: boolean;
		/** Whether the session is recent enough to create the password. */
		recent?: boolean;
		/** The last post asked to confirm with Google. */
		reauth?: boolean;
		variant?: 'page' | 'drawer';
		/** Drawer: the password changed. */
		onsaved?: () => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	let current = $state('');
	let next = $state('');
	// Errors from the drawer's post; the page shows the server-rendered ones instead.
	let posted = $state<{ errors: Errors; formError?: string; reauth?: boolean }>({ errors: {} });
	const shown = $derived({ ...errors, ...posted.errors });
	const message = $derived(posted.formError ?? formError);
	const needsGoogle = $derived(!hasPassword && (!recent || posted.reauth || reauth));
</script>

{#if needsGoogle}
	<div class="reauth">
		<p>Por seguridad, confirmá que sos vos entrando de nuevo con Google.</p>
		{#if message}<p class="error" role="alert">{message}</p>{/if}
		<!-- Plain form: it leaves for Google with a full navigation. -->
		<form method="POST" action="/profile/password?/google">
			<Button type="submit">Confirmar con Google</Button>
		</form>
	</div>
{:else}
	<FormShell
		action="/profile/password?/save"
		{variant}
		onfailure={(data: { errors?: Errors; formError?: string; reauth?: boolean }) =>
			(posted = { errors: data.errors ?? {}, formError: data.formError, reauth: data.reauth })}
		{onsaved}
		{onclose}
		cancelHref="/profile"
		canSave={(!hasPassword || !!current) && !!next}
		style="--form-gap: 0.875rem; --actions-mt: var(--space-2)"
	>
		{#if hasPassword}
			<div class="field">
				<label for="current-password">Contraseña actual</label>
				<PasswordInput
					outlined
					id="current-password"
					name="currentPassword"
					bind:value={current}
					autocomplete="current-password"
					maxlength={PASSWORD_MAX_LENGTH}
					invalid={!!shown.current}
					describedby={shown.current ? 'current-error' : undefined}
				/>
				{#if shown.current}<p class="error" id="current-error" role="alert">{shown.current}</p>{/if}
			</div>
		{/if}
		<div class="field">
			<label for="new-password">Contraseña nueva</label>
			<PasswordInput
				outlined
				id="new-password"
				name="newPassword"
				bind:value={next}
				autocomplete="new-password"
				minlength={PASSWORD_MIN_LENGTH}
				maxlength={PASSWORD_MAX_LENGTH}
				invalid={!!shown.next}
				describedby={shown.next ? 'next-error' : undefined}
			/>
			{#if shown.next}<p class="error" id="next-error" role="alert">{shown.next}</p>{/if}
		</div>
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

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.field label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
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
