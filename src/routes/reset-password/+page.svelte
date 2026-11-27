<script lang="ts">
	import { PASSWORD_MIN_LENGTH } from '#lib/constants.ts';
	import { es } from '#lib/copy/es.ts';
	import { resolve } from '$app/paths';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import AuthPage from '#lib/components/AuthPage.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import PasswordField from '#lib/components/PasswordField.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let password = $state('');

	const expired = $derived(data.expired || !!form?.expired);
</script>

<svelte:head>
	<title>{expired ? 'Enlace vencido' : 'Nueva contraseña'} · Gastar</title>
</svelte:head>

{#if expired}
	<AuthPage
		backHref={resolve('login')}
		title="Enlace vencido"
		icon="clock"
		description="Los enlaces para cambiar la contraseña duran 1 hora. Pedí uno nuevo."
	>
		<div class="actions">
			<Button href={resolve('forgot-password')} class="w-full">Pedir otro</Button>
			<Button href={resolve('login')} variant="outline" class="w-full">Ir a Ingresar</Button>
		</div>
	</AuthPage>
{:else}
	<AuthPage backHref={resolve('login')} title="Nueva contraseña">
		<AuthForm action="?/reset" submitLabel="Guardar contraseña" onupdated={() => (password = '')}>
			<input type="hidden" name="token" value={data.token} />
			<PasswordField
				bind:value={password}
				autocomplete="new-password"
				minlength={PASSWORD_MIN_LENGTH}
				error={form?.passwordError}
				hint={es.common.fields.passwordMin}
			/>
		</AuthForm>
	</AuthPage>
{/if}

<style>
	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
</style>
