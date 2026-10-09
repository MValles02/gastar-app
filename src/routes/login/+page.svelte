<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
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

	const reset = $derived(page.url.searchParams.get('reset') === '1');

	async function focusFirstInvalid() {
		await tick();
		formEl?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
	}
</script>

<svelte:head>
	<title>Ingresar · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail email={form.checkEmail} />
{:else}
	<main class="page">
		<h1 class="brand">
			<Wordmark size="2.25rem" />
		</h1>

		<nav class="seg" aria-label="Acceso">
			<a href={resolve('/login')} aria-current="page">Ingresar</a>
			<a href={resolve('/signup')}>Crear cuenta</a>
		</nav>

		{#if reset && !form}
			<p class="note" role="status">
				<Icon name="check" size="1.25rem" />Contraseña actualizada.
			</p>
		{/if}

		<form
			bind:this={formEl}
			method="POST"
			action="?/login"
			novalidate
			class="form"
			class:busy
			aria-busy={busy}
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
					password = '';
					await focusFirstInvalid();
				};
			}}
		>
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
				<div class="control">
					<input
						id="password"
						type={showPassword ? 'text' : 'password'}
						name="password"
						autocomplete="current-password"
						bind:value={password}
						required
						aria-invalid={form?.passwordError ? true : undefined}
						aria-describedby={form?.passwordError ? 'password-error' : undefined}
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
				{#if form?.passwordError}
					<p class="error" id="password-error" role="alert">
						<Icon name="alert" size="1rem" />{form.passwordError}
					</p>
				{/if}
			</div>

			<a class="forgot" href={resolve('/forgot-password')}>Olvidé mi contraseña</a>

			{#if form?.formError}
				<p class="error" role="alert"><Icon name="alert" size="1rem" />{form.formError}</p>
			{/if}

			<button type="submit" class="submit" disabled={busy}>Ingresar</button>
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

	.forgot {
		align-self: flex-end;
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		margin-block: calc(-1 * var(--space-3)) calc(-1 * var(--space-2));
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-underline-offset: 3px;
		text-decoration-color: var(--border-strong);
	}

	.submit {
		width: 100%;
		margin-top: var(--space-2);
	}
</style>
