<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selected = $derived(data.theme);
	let themeForm: HTMLFormElement;

	function applyTheme(value: string) {
		if (value === 'light' || value === 'dark') {
			document.documentElement.dataset.theme = value;
		} else {
			delete document.documentElement.dataset.theme;
		}
	}
</script>

<svelte:head>
	<title>Perfil · Gastar</title>
</svelte:head>

<h1>Perfil</h1>

<section class="user-info">
	<p class="name">{data.user.name}</p>
	<p class="email muted">{data.user.email}</p>
</section>

<section>
	<h2>Tema</h2>

	<form
		method="POST"
		action="?/theme"
		bind:this={themeForm}
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') applyTheme(selected);
				await update({ reset: false });
			};
		}}
		class="theme-form"
	>
		<label class="radio">
			<input
				type="radio"
				name="theme"
				value="light"
				bind:group={selected}
				onchange={() => themeForm.requestSubmit()}
			/>
			Claro
		</label>
		<label class="radio">
			<input
				type="radio"
				name="theme"
				value="dark"
				bind:group={selected}
				onchange={() => themeForm.requestSubmit()}
			/>
			Oscuro
		</label>
		<label class="radio">
			<input
				type="radio"
				name="theme"
				value="system"
				bind:group={selected}
				onchange={() => themeForm.requestSubmit()}
			/>
			Sistema
		</label>

		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}

		<button type="submit" class="btn-secondary">Guardar</button>
	</form>
</section>

<form method="POST" action="/logout" class="logout-form">
	<button type="submit" class="btn-secondary">Cerrar sesión</button>
</form>

<style>
	.muted {
		color: var(--text-muted);
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin-bottom: var(--space-6);
	}

	.name {
		font-weight: 500;
	}

	h2 {
		font-size: var(--font-size-base);
		margin-bottom: var(--space-3);
	}

	.theme-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}

	.radio {
		flex-direction: row;
		align-items: center;
		gap: var(--space-2);
		color: var(--text);
		font-size: var(--font-size-base);
	}

	.radio input {
		width: auto;
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
