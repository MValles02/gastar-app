<script lang="ts">
	import { enhance } from '$app/forms';
	import { followRedirect } from '$lib/nav-stack.svelte';
	import { resolve } from '$app/paths';
	import FormActions from '$lib/components/FormActions.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '$lib/limits';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let current = $state('');
	let next = $state('');
</script>

<svelte:head>
	<title>Cambiar contraseña · Gastar</title>
</svelte:head>

<PageHeader title="Cambiar contraseña" close={{ href: resolve('/profile'), label: 'Cerrar' }} />

<form
	method="POST"
	use:enhance={() => (input) => followRedirect(input, { reset: false })}
	class="form"
	novalidate
>
	<ul class="card">
		<li class:bad={form?.errors?.current}>
			<TextRow
				id="current-password"
				name="currentPassword"
				label="Contraseña actual"
				bind:value={current}
				password
				autocomplete="current-password"
				maxlength={PASSWORD_MAX_LENGTH}
				required
				error={form?.errors?.current}
				errorId="current-error"
			/>
		</li>
		<li class:bad={form?.errors?.next}>
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
				error={form?.errors?.next}
				errorId="next-error"
			/>
		</li>
	</ul>
	<p class="hint">Mínimo {PASSWORD_MIN_LENGTH} caracteres. Cerramos tus otras sesiones.</p>
	{#if form?.formError}<p class="error" role="alert">{form.formError}</p>{/if}
	<FormActions cancelHref="/profile" submitLabel="Guardar cambios" />
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
</style>
