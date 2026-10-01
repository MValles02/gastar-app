<script lang="ts">
	import { enhance } from '$app/forms';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import Card from '$lib/components/Card.svelte';
	import Field from '$lib/components/Field.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Ingresar · Gastar</title>
</svelte:head>

<main class="page">
	<h1 class="brand">
		<Wordmark size="2.25rem" />
	</h1>

	<Card maxWidth="360px">
		<form method="POST" use:enhance class="form">
			<Field label="Email">
				<input
					type="email"
					name="email"
					autocomplete="username"
					value={form?.email ?? ''}
					required
				/>
			</Field>

			<Field label="Contraseña" error={form?.error} errorId="login-error">
				<input
					type="password"
					name="password"
					autocomplete="current-password"
					required
					aria-invalid={form?.error ? true : undefined}
					aria-describedby={form?.error ? 'login-error' : undefined}
				/>
			</Field>

			<Button type="submit" block>Ingresar</Button>
		</form>
	</Card>
</main>

<style>
	.page {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
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
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
</style>
