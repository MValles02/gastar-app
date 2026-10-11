<script lang="ts">
	import { PASSWORD_MIN_LENGTH } from '$lib/limits';
	import { resolve } from '$app/paths';
	import AuthForm from '$lib/components/AuthForm.svelte';
	import AuthPage from '$lib/components/AuthPage.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ErrorText from '$lib/components/ErrorText.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let password = $state('');

	const expired = $derived(data.expired || !!form?.expired);
</script>

<svelte:head>
	<title>{expired ? 'Enlace vencido' : 'Nueva contraseña'} · Gastar</title>
</svelte:head>

{#if expired}
	<main>
		<Empty.Root class="min-h-dvh">
			<Empty.Header>
				<Empty.Media variant="icon" aria-hidden="true"
					><Icon name="clock" size="1rem" /></Empty.Media
				>
				<Empty.Title role="heading" aria-level={1}>Enlace vencido</Empty.Title>
			</Empty.Header>
			<Empty.Content>
				<p class="body">Pedí uno nuevo.</p>
				<div class="actions">
					<Button href={resolve('/forgot-password')} class="w-full">Pedir otro</Button>
					<a class="link" href={resolve('/login')}>Ir a Ingresar</a>
				</div>
			</Empty.Content>
		</Empty.Root>
	</main>
{:else}
	<AuthPage>
		<a class="back" href={resolve('/login')}>
			<Icon name="chevron-left" size="1.25rem" /><span class="visually-hidden"
				>Volver a Ingresar</span
			>
		</a>
		<h1>Nueva contraseña</h1>

		<AuthForm action="?/reset" submitLabel="Guardar" onupdated={() => (password = '')}>
			<input type="hidden" name="token" value={data.token} />
			<div class="field">
				<label for="password">Contraseña</label>
				<PasswordInput
					bind:value={password}
					autocomplete="new-password"
					minlength={PASSWORD_MIN_LENGTH}
					invalid={!!form?.passwordError}
					describedby={form?.passwordError ? 'password-error' : 'password-hint'}
				/>
				{#if form?.passwordError}
					<ErrorText id="password-error" message={form.passwordError} />
				{:else}
					<p class="hint" id="password-hint">Mínimo 8 caracteres.</p>
				{/if}
			</div>
		</AuthForm>
	</AuthPage>
{/if}

<style>
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
