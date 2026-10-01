<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selected = $derived(data.theme);
	let themeForm: HTMLFormElement;

	const themeOptions = [
		{ value: 'light', label: 'Claro' },
		{ value: 'dark', label: 'Oscuro' },
		{ value: 'system', label: 'Sistema' }
	];

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

<PageHeader title="Perfil" />

<div class="sections">
	<Card>
		<section class="user-info">
			<p class="name">{data.user.name}</p>
			<p class="muted">{data.user.email}</p>
		</section>
	</Card>

	<Card>
		<section>
			<h2 id="theme-heading">Tema</h2>

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
				<SegmentedControl
					name="theme"
					options={themeOptions}
					bind:value={selected}
					labelledby="theme-heading"
					onchange={() => themeForm.requestSubmit()}
				/>

				{#if form?.error}
					<p class="error" role="alert">{form.error}</p>
				{/if}

				<Button type="submit" variant="secondary">Guardar</Button>
			</form>
		</section>
	</Card>

	<Card>
		<form method="POST" action="/logout">
			<Button type="submit" variant="secondary" block>Cerrar sesión</Button>
		</form>
	</Card>
</div>

<style>
	.sections {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.muted {
		color: var(--text-muted);
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
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
	}

	.theme-form :global(.btn) {
		align-self: flex-start;
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
