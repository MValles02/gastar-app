<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import CheckEmail from '$lib/components/CheckEmail.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let busy = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
</script>

<svelte:head>
	<title>{data.expired ? 'Enlace vencido' : 'Email confirmado'} · Gastar</title>
</svelte:head>

{#if form?.checkEmail}
	<CheckEmail email={form.checkEmail} />
{:else if data.expired}
	<main class="msg">
		<span class="icon" aria-hidden="true"><Icon name="clock" size="1.75rem" /></span>
		<h1>Enlace vencido</h1>
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
					<p class="error" id="email-error" role="alert">
						<Icon name="alert" size="1rem" />{form.emailError}
					</p>
				{/if}
			</div>
			<Button type="submit" block disabled={busy}>Reenviar</Button>
			<a class="link" href={resolve('/login')}>Ir a Ingresar</a>
		</form>
	</main>
{:else}
	<main class="msg">
		<span class="icon" aria-hidden="true"><Icon name="check" size="1.75rem" /></span>
		<h1>Email confirmado</h1>
		<p class="body">Ya podés ingresar a Gastar.</p>
		<div class="actions">
			<Button href={resolve('/login')} block>Ir a Ingresar</Button>
		</div>
	</main>
{/if}

<style>
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
