<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import AuthPage from '#lib/components/AuthPage.svelte';

	// Shared "Revisá tu email" screen. The page that renders it must have a `resend` action.
	// `verify` confirms an account; `reset` is the neutral password-reset confirmation and never says
	// whether the address has an account. `onshown` runs once the screen has mounted.
	let {
		email,
		kind,
		backHref,
		onshown
	}: { email: string; kind: 'verify' | 'reset'; backHref: string; onshown?: () => void } = $props();

	const COOLDOWN_SECONDS = 60;
	// Starts at 0 so without JS the button stays usable; the countdown only exists with JS.
	let seconds = $state(0);
	let sent = $state(false);

	onMount(() => {
		onshown?.();
		seconds = COOLDOWN_SECONDS;
		const timer = setInterval(() => {
			if (seconds > 0) seconds--;
		}, 1000);
		return () => clearInterval(timer);
	});

	const clock = $derived(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
</script>

<AuthPage {backHref} title="Revisá tu email" icon="mail">
	{#snippet description()}
		{#if kind === 'verify'}
			Te mandamos un enlace a <b>{email}</b> para confirmar tu cuenta. Vence en 24 horas.
		{:else}
			Si hay una cuenta con ese email, te llega un enlace para crear una contraseña nueva. Vence en
			1 hora.
		{/if}
	{/snippet}

	<form
		method="POST"
		action="?/resend"
		class="actions"
		use:enhance={({ cancel }) => {
			if (seconds > 0) {
				cancel();
				return;
			}
			return async ({ update }) => {
				await update({ reset: false });
				seconds = COOLDOWN_SECONDS;
				sent = true;
			};
		}}
	>
		<input type="hidden" name="email" value={email} />
		{#if kind === 'reset'}
			<Button href={resolve('login')} class="w-full">Ir a Ingresar</Button>
		{/if}
		<Button
			type="submit"
			variant="outline"
			class="w-full aria-disabled:opacity-50"
			aria-disabled={seconds > 0}
		>
			{seconds > 0 ? `Reenviar en ${clock}` : 'Reenviar'}
		</Button>
		{#if sent}
			<p class="sent" role="status">Enviamos otro enlace.</p>
		{/if}
	</form>
</AuthPage>

<style>
	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.sent {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}
</style>
