<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let password = $state('');
	let showPassword = $state(false);
	let busy = $state(false);
	let formEl: HTMLFormElement | undefined = $state();

	const expired = $derived(data.expired || !!form?.expired);
</script>

<svelte:head>
	<title>{expired ? 'Enlace vencido' : 'Nueva contraseña'} · Gastar</title>
</svelte:head>

{#if expired}
	<main class="msg">
		<span class="icon" aria-hidden="true"><Icon name="clock" size="1.75rem" /></span>
		<h1>Enlace vencido</h1>
		<p class="body">Pedí uno nuevo.</p>
		<div class="actions">
			<Button href={resolve('/forgot-password')} block>Pedir otro</Button>
			<a class="link" href={resolve('/login')}>Ir a Ingresar</a>
		</div>
	</main>
{:else}
	<main class="page">
		<a class="back" href={resolve('/login')}>
			<Icon name="chevron-left" size="1.25rem" /><span class="visually-hidden"
				>Volver a Ingresar</span
			>
		</a>
		<h1>Nueva contraseña</h1>

		<form
			bind:this={formEl}
			method="POST"
			action="?/reset"
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
					await tick();
					formEl?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
				};
			}}
		>
			<input type="hidden" name="token" value={data.token} />
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
						minlength="8"
						aria-invalid={form?.passwordError ? true : undefined}
						aria-describedby={form?.passwordError ? 'password-error' : 'password-hint'}
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
				{:else}
					<p class="hint" id="password-hint">Mínimo 8 caracteres.</p>
				{/if}
			</div>

			<button type="submit" class="submit" disabled={busy}>Guardar</button>
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

	.back {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		margin-left: calc(-1 * var(--space-3));
		color: var(--text);
	}

	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.875rem;
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.01em;
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

	.msg {
		min-height: 100vh;
		min-height: 100dvh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: var(--space-3);
		padding: var(--space-5);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 4rem;
		height: 4rem;
		border-radius: 999px;
		background: var(--muted);
		color: var(--text);
		margin-bottom: var(--space-2);
	}

	.body {
		margin: 0;
		font-size: var(--font-size-base);
		color: var(--text-muted);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
		max-width: 360px;
		margin-top: var(--space-4);
	}

	.link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--tap-target);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text);
		text-underline-offset: 3px;
		text-decoration-color: var(--border-strong);
	}
</style>
