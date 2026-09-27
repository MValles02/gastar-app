<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Ingresar · Gastar</title>
</svelte:head>

<div class="page">
	<div class="card">
		<h1 class="app-name">Gastar</h1>

		<form method="POST" use:enhance class="form">
			<label>
				Email
				<input
					type="email"
					name="email"
					autocomplete="username"
					value={form?.email ?? ''}
					required
				/>
			</label>

			<label>
				Contraseña
				<input type="password" name="password" autocomplete="current-password" required />
			</label>

			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}

			<button type="submit" class="btn-block">Ingresar</button>
		</form>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-5);
	}

	.card {
		width: 100%;
		max-width: 360px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: var(--space-6) var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.app-name {
		text-align: center;
		font-size: var(--font-size-xl);
		font-weight: 600;
		color: var(--primary);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
