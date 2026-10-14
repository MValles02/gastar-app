<script lang="ts">
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { PASSWORD_MAX_LENGTH } from '$lib/limits';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const FORM_ID = 'delete-account';
	let password = $state('');
</script>

<svelte:head>
	<title>Eliminar cuenta · Gastar</title>
</svelte:head>

<PageHeader title="Eliminar cuenta" close={{ href: resolve('/profile'), label: 'Cerrar' }} />

<div class="page">
	<p>
		Se borran para siempre tu cuenta y todos tus datos: cuentas, movimientos, categorías y plan. No
		se puede deshacer.
	</p>

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

	<div class="actions">
		<Button href={resolve('/profile')} variant="outline" class="min-h-11 flex-1">Cancelar</Button>
		<div class="confirm">
			<ConfirmDialog
				triggerLabel="Eliminar cuenta"
				triggerVariant="destructive"
				title="¿Eliminar tu cuenta?"
				confirmLabel="Eliminar"
				action="?/delete"
				formId={FORM_ID}
				closeOnFailure
			>
				Se borran para siempre tu cuenta y todos tus datos. No se puede deshacer.
			</ConfirmDialog>
		</div>
	</div>
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

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	.confirm {
		flex: 2;
		min-width: 0;
	}

	.confirm :global(button),
	.confirm :global(summary) {
		width: 100%;
		min-height: 2.75rem;
	}
</style>
