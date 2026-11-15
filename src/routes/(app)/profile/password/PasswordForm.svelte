<script lang="ts">
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { followRedirect } from '#lib/nav-stack.svelte.ts';
	import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '#lib/fields.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import FormActions from '#lib/components/FormActions.svelte';
	import PasswordInput from '#lib/components/PasswordInput.svelte';

	type Errors = { current?: string; next?: string };

	/**
	 * The change-password form. `drawer`: the "Cambiar contraseña" drawer (posts to /profile/password
	 * and reports the result instead of navigating). `page`: the /profile/password page.
	 */
	let {
		errors = {},
		formError,
		variant = 'page',
		onsaved,
		onclose
	}: {
		errors?: Errors;
		formError?: string;
		variant?: 'page' | 'drawer';
		/** Drawer: the password changed. */
		onsaved?: () => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');

	let current = $state('');
	let next = $state('');
	let submitting = $state(false);
	// Errors from the drawer's post; the page shows the server-rendered ones instead.
	let posted = $state<{ errors: Errors; formError?: string }>({ errors: {} });
	const shown = $derived({ ...errors, ...posted.errors });
	const message = $derived(posted.formError ?? formError);
</script>

<form
	method="POST"
	action={drawer ? resolve('profile/password') : ''}
	class="form"
	novalidate
	use:enhance={() => {
		submitting = true;
		return async (input) => {
			const { result } = input;
			if (!drawer) {
				await followRedirect(input, { reset: false });
			} else if (result.type === 'redirect') {
				onsaved?.();
			} else if (result.type === 'failure') {
				const data = (result.data ?? {}) as { errors?: Errors; formError?: string };
				posted = { errors: data.errors ?? {}, formError: data.formError };
				await tick();
				document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus();
			} else {
				toast.error('No se pudo guardar.');
			}
			submitting = false;
		};
	}}
>
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
	<p class="hint">Mínimo {PASSWORD_MIN_LENGTH} caracteres. Cerramos tus otras sesiones.</p>
	{#if message}<p class="error" role="alert">{message}</p>{/if}

	{#if drawer}
		<div class="actions">
			<Button
				type="button"
				variant="outline"
				class="min-w-0 flex-1 basis-0"
				onclick={() => onclose?.()}>Cancelar</Button
			>
			<Button
				type="submit"
				class="min-w-0 flex-1 basis-0"
				disabled={!current || !next || submitting}>Guardar</Button
			>
		</div>
	{:else}
		<FormActions cancelHref="/profile" submitLabel="Guardar" {submitting} />
	{/if}
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		padding-top: var(--space-1);
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

	.actions {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}
</style>
