<script lang="ts">
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import DangerCallout from '$lib/components/DangerCallout.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import { PASSWORD_MAX_LENGTH } from '$lib/limits';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const FORM_ID = 'delete-account';
	let password = $state('');
</script>

<svelte:head>
	<title>Darme de baja · Gastar</title>
</svelte:head>

<PageHeader title="Darme de baja" close={{ href: resolve('/profile'), label: 'Cerrar' }} />

<div class="page">
	<DangerCallout>
		Se borran para siempre tu cuenta y todos tus datos: cuentas, movimientos, categorías y plan. No
		se puede deshacer.
	</DangerCallout>

	<ul class="card">
		<li class:bad={form?.error}>
			<TextRow
				id="delete-password"
				name="password"
				form={FORM_ID}
				label="Contraseña"
				bind:value={password}
				password
				autocomplete="current-password"
				maxlength={PASSWORD_MAX_LENGTH}
				error={form?.error}
				errorId="delete-error"
			/>
		</li>
	</ul>

	<FormActions cancelHref="/profile" sticky={false}>
		{#snippet primary()}
			<ConfirmDialog
				triggerLabel="Darme de baja"
				triggerVariant="destructive"
				triggerClass="w-full"
				title="¿Darte de baja?"
				confirmLabel="Darme de baja"
				action="?/delete"
				formId={FORM_ID}
				closeOnFailure
			>
				Se borran para siempre tu cuenta y todos tus datos. No se puede deshacer.
			</ConfirmDialog>
		{/snippet}
	</FormActions>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
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
