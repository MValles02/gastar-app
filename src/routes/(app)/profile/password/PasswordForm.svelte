<script lang="ts">
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { followRedirect } from '$lib/nav-stack.svelte';
	import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '$lib/limits';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormActions from '$lib/components/FormActions.svelte';
	import TextRow from '$lib/components/TextRow.svelte';

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
	action={drawer ? resolve('/profile/password') : ''}
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
	<ul class="card">
		<li class:bad={shown.current}>
			<TextRow
				id="current-password"
				name="currentPassword"
				label="Contraseña actual"
				bind:value={current}
				password
				autocomplete="current-password"
				maxlength={PASSWORD_MAX_LENGTH}
				required
				error={shown.current}
				errorId="current-error"
			/>
		</li>
		<li class:bad={shown.next}>
			<TextRow
				id="new-password"
				name="newPassword"
				label="Contraseña nueva"
				bind:value={next}
				password
				autocomplete="new-password"
				minlength={PASSWORD_MIN_LENGTH}
				maxlength={PASSWORD_MAX_LENGTH}
				required
				error={shown.next}
				errorId="next-error"
			/>
		</li>
	</ul>
	<p class="hint">Mínimo {PASSWORD_MIN_LENGTH} caracteres. Cerramos tus otras sesiones.</p>
	{#if message}<p class="error" role="alert">{message}</p>{/if}

	{#if drawer}
		<div class="actions">
			<Button
				type="button"
				variant="outline"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0"
				onclick={() => onclose?.()}>Cancelar</Button
			>
			<Button
				type="submit"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0"
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
		gap: var(--space-3);
		padding-top: var(--space-1);
	}

	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		padding: 0 var(--space-1);
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
