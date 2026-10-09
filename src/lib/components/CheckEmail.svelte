<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import Icon from '$lib/components/Icon.svelte';

	// Shared "Revisá tu email" state. The page that renders it must have a `resend` action.
	let { email }: { email: string } = $props();

	const COOLDOWN_SECONDS = 60;
	// Starts at 0 so without JS the button stays usable; the countdown only exists with JS.
	let seconds = $state(0);
	let sent = $state(false);

	onMount(() => {
		seconds = COOLDOWN_SECONDS;
		const timer = setInterval(() => {
			if (seconds > 0) seconds--;
		}, 1000);
		return () => clearInterval(timer);
	});

	const clock = $derived(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
</script>

<main class="page">
	<span class="icon" aria-hidden="true"><Icon name="mail" size="1.75rem" /></span>
	<h1>Revisá tu email</h1>
	<p class="body">Enviamos un enlace a <b>{email}</b>.</p>

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
		<Button type="submit" variant="secondary" block aria-disabled={seconds > 0}>
			{seconds > 0 ? `Reenviar en ${clock}` : 'Reenviar'}
		</Button>
		{#if sent}
			<p class="sent" role="status">Enviamos otro enlace.</p>
		{/if}
		<a class="back" href={resolve('/login')}>Volver a ingresar</a>
	</form>
</main>

<style>
	.page {
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
		max-width: 300px;
		font-size: var(--font-size-base);
		line-height: 1.45;
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}

	.body b {
		color: var(--text);
		font-weight: 600;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
		max-width: 360px;
		margin-top: var(--space-4);
	}

	.sent {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.75rem;
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text);
		text-underline-offset: 3px;
		text-decoration-color: var(--border-strong);
	}
</style>
