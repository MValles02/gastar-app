<script lang="ts">
	import { enhance } from '$app/forms';
	import { enhanceRedirect } from '$lib/nav-stack.svelte';
	import { resolve } from '$app/paths';
	import FormActions from '$lib/components/FormActions.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(form?.name ?? data.name);
</script>

<svelte:head>
	<title>Cambiar nombre · Gastar</title>
</svelte:head>

<PageHeader title="Cambiar nombre" close={{ href: resolve('/profile'), label: 'Cerrar' }} />

<form method="POST" use:enhance={() => enhanceRedirect} class="form" novalidate>
	<ul class="card">
		<li class:bad={form?.error}>
			<TextRow
				id="name"
				name="name"
				label="Nombre"
				bind:value={name}
				maxlength={80}
				required
				error={form?.error}
				errorId="name-error"
			/>
		</li>
	</ul>
	<FormActions cancelHref="/profile" submitLabel="Guardar cambios" />
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}
</style>
