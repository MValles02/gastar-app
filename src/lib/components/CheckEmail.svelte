<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
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

<main>
	<Empty.Root class="min-h-dvh">
		<Empty.Header>
			<Empty.Media variant="icon" aria-hidden="true"><Icon name="mail" size="1rem" /></Empty.Media>
			<Empty.Title role="heading" aria-level={1}>Revisá tu email</Empty.Title>
		</Empty.Header>
		<Empty.Content>
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
				<a class="back" href={resolve('/login')}>Volver a ingresar</a>
			</form>
		</Empty.Content>
	</Empty.Root>
</main>

<style>
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
		min-height: var(--tap-target);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text);
		text-underline-offset: 3px;
		text-decoration-color: var(--border-strong);
	}
</style>
