<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import CheckEmail from '$lib/components/CheckEmail.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let password = $state('');
	let showPassword = $state(false);
	let busy = $state(false);
	let formEl: HTMLFormElement | undefined = $state();

	async function focusFirstInvalid() {
		await tick();
		formEl?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
	}
</script>

<svelte:head>
	<title>Crear cuenta · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail email={form.checkEmail} />
{:else}
	<main class="page">
		<h1 class="brand">
			<Wordmark size="2.25rem" />
		</h1>

		<nav class="seg" aria-label="Acceso">
			<a href={resolve('/login')}>Ingresar</a>
			<a href={resolve('/signup')} aria-current="page">Crear cuenta</a>
		</nav>

		<form
			bind:this={formEl}
			method="POST"
			action="?/signup"
			novalidate
			class="form"
			class:busy
			aria-busy={busy}
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
					await focusFirstInvalid();
				};
			}}
		>
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
					<p class="error" id="name-error" role="alert">
						<Icon name="alert" size="1rem" />{form.errors.name}
					</p>
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
					<p class="error" id="email-error" role="alert">
						<Icon name="alert" size="1rem" />{form.errors.email}
					</p>
				{/if}
			</div>

			<div class="field">
				<label for="password">Contraseña</label>
				<div class="control">
					<input
						id="password"
						type={showPassword ? 'text' : 'password'}
						name="password"
						autocomplete="new-password"
						bind:value={password}
						required
						aria-invalid={form?.errors?.password ? true : undefined}
						aria-describedby="password-hint"
					/>
					<button
						type="button"
						class="eye"
						aria-pressed={showPassword}
						onclick={() => (showPassword = !showPassword)}
					>
						<Icon name={showPassword ? 'eye-off' : 'eye'} size="1.25rem" />
						<span class="visually-hidden">
							{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
						</span>
					</button>
				</div>
				{#if form?.errors?.password}
					<p class="error" id="password-hint" role="alert">
						<Icon name="alert" size="1rem" />{form.errors.password}
					</p>
				{:else}
					<p class="hint" id="password-hint">Mínimo 8 caracteres.</p>
				{/if}
			</div>

			{#if form?.formError}
				<p class="error" role="alert"><Icon name="alert" size="1rem" />{form.formError}</p>
			{/if}

			<button type="submit" class="submit" disabled={busy}>Crear cuenta</button>
		</form>
	</main>
{/if}

<style>
	.page {
		box-sizing: border-box;
		min-height: 100vh;
		min-height: 100dvh;
		width: 100%;
		max-width: 400px;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--space-5);
		padding: max(var(--space-5), env(safe-area-inset-top))
			max(var(--space-5), env(safe-area-inset-right))
			max(var(--space-5), env(safe-area-inset-bottom))
			max(var(--space-5), env(safe-area-inset-left));
	}

	.brand {
		margin: 0;
		font: inherit;
		text-align: center;
	}

	.seg {
		display: flex;
		gap: 2px;
		padding: 3px;
		background: var(--muted);
		border-radius: var(--radius);
	}

	.seg a {
		flex: 1;
		display: grid;
		place-items: center;
		min-height: var(--tap-target);
		border-radius: calc(var(--radius) - 3px);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text-muted);
		text-decoration: none;
	}

	.seg a[aria-current='page'] {
		background: var(--segment-selected);
		color: var(--text);
		box-shadow: var(--shadow-1);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form.busy {
		opacity: 0.55;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.control {
		position: relative;
	}

	.control input {
		padding-right: var(--tap-target);
	}

	.eye {
		position: absolute;
		top: 0;
		right: 0;
		width: var(--tap-target);
		height: 100%;
		padding: 0;
		background: none;
		border: 0;
		color: var(--text-muted);
	}

	.hint {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.error {
		margin: 0;
		display: flex;
		align-items: flex-start;
		gap: var(--space-1);
		font-size: var(--font-size-sm);
		color: var(--negative);
	}

	.error :global(svg) {
		flex: none;
		margin-top: 0.1rem;
	}

	.submit {
		width: 100%;
		margin-top: var(--space-2);
	}
</style>
