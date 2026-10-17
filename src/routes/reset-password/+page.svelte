<script lang="ts">
	import { PASSWORD_MIN_LENGTH } from '$lib/limits';
	import { resolve } from '$app/paths';
	import AuthForm from '$lib/components/AuthForm.svelte';
	import AuthPage from '$lib/components/AuthPage.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
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
				<div class="actions">
					<Button href={resolve('/forgot-password')} class="w-full">Pedir otro</Button>
					<a class="link" href={resolve('/login')}>Ir a Ingresar</a>
				</div>
			</Empty.Content>
		</Empty.Root>
	</main>
{:else}
	<AuthPage backHref={resolve('/login')} title="Nueva contraseña">
		<AuthForm action="?/reset" submitLabel="Guardar" onupdated={() => (password = '')}>
			<input type="hidden" name="token" value={data.token} />
			<Field.Field>
				<Field.Label for="password">Contraseña</Field.Label>
				<PasswordInput
					bind:value={password}
					autocomplete="new-password"
					minlength={PASSWORD_MIN_LENGTH}
					invalid={!!form?.passwordError}
					describedby={form?.passwordError ? 'password-error' : 'password-hint'}
				/>
				{#if form?.passwordError}
					<Field.Error id="password-error">{form.passwordError}</Field.Error>
				{:else}
					<Field.Description id="password-hint">Mínimo 8 caracteres.</Field.Description>
				{/if}
			</Field.Field>
		</AuthForm>
	</AuthPage>
{/if}

<style>
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
