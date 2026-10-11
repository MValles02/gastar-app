<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import CheckEmail from '$lib/components/CheckEmail.svelte';
	import ErrorText from '$lib/components/ErrorText.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let busy = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
</script>

<svelte:head>
	<title>Enlace vencido · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail email={form.checkEmail} />
{:else}
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
				<form
					bind:this={formEl}
					method="POST"
					action="?/resend"
					novalidate
					class="actions"
					class:busy
					aria-busy={busy}
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update({ reset: false });
							busy = false;
							await tick();
							formEl?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
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
							required
							aria-invalid={form?.emailError ? true : undefined}
							aria-describedby={form?.emailError ? 'email-error' : undefined}
						/>
						{#if form?.emailError}
							<ErrorText id="email-error" message={form.emailError} />
						{/if}
					</div>
					<Button type="submit" class="w-full" disabled={busy}>Reenviar</Button>
					<a class="link" href={resolve('/login')}>Ir a Ingresar</a>
				</form>
			</Empty.Content>
		</Empty.Root>
	</main>
{/if}

<style>
	.body {
		margin: 0;
		font-size: var(--font-size-base);
		color: var(--text-muted);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		width: 100%;
		max-width: 360px;
		margin-top: var(--space-4);
		text-align: left;
	}

	.actions.busy {
		opacity: 0.55;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
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
