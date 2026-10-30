<script lang="ts">
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import SheetHeader from '$lib/components/SheetHeader.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import DangerCallout from '$lib/components/DangerCallout.svelte';
	import { PASSWORD_MAX_LENGTH } from '$lib/limits';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const FORM_ID = 'delete-account';
	let password = $state('');
</script>

<svelte:head>
	<title>Eliminar cuenta · Gastar</title>
</svelte:head>

<SheetHeader title="Eliminar cuenta" cancel={{ href: resolve('/profile') }}>
	<div class="page">
		<DangerCallout>
			Se borran para siempre tu cuenta y todos tus datos: cuentas, movimientos, categorías y plan.
			No se puede deshacer.
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

		<ConfirmDialog
			triggerLabel="Eliminar cuenta"
			triggerVariant="destructive"
			triggerClass="w-full"
			title="¿Eliminar tu cuenta?"
			confirmLabel="Eliminar"
			action="?/delete"
			formId={FORM_ID}
			closeOnFailure
		>
			Se borran para siempre tu cuenta y todos tus datos. No se puede deshacer.
		</ConfirmDialog>
	</div>
</SheetHeader>

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
