<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.js';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Icon from '#lib/components/Icon.svelte';

	/**
	 * A detail page's bottom: the action's error, a muted note, then Ver movimientos (`movementsHref`),
	 * Archivar / Desarchivar (plain enhanced posts, so they work without JS) and Eliminar
	 * behind a confirm. Each page passes its own copy; `actions` overrides the action paths.
	 */
	let {
		can,
		messages,
		actions,
		formError,
		note,
		movementsHref
	}: {
		can: { canArchive: boolean; canUnarchive: boolean; canDelete: boolean };
		messages: { archive: string; unarchive: string; deleteTitle: string; deleteBody: string };
		actions?: { archive?: string; unarchive?: string; delete?: string };
		formError?: string | null;
		note?: string | null;
		movementsHref?: string;
	} = $props();
</script>

{#if formError}
	<p class="error" role="alert"><Icon name="alert" size="1rem" />{formError}</p>
{/if}

{#if note}<p class="note">{note}</p>{/if}

<div class="actions">
	{#if movementsHref}
		<Button href={movementsHref} variant="outline" class="w-full">Ver movimientos</Button>
	{/if}
	{#if can.canArchive}
		<form method="POST" action={actions?.archive ?? '?/archive'} use:enhance>
			<Button type="submit" variant="outline" class="w-full">{messages.archive}</Button>
		</form>
	{/if}
	{#if can.canUnarchive}
		<form method="POST" action={actions?.unarchive ?? '?/unarchive'} use:enhance>
			<Button type="submit" class="w-full">{messages.unarchive}</Button>
		</form>
	{/if}
	{#if can.canDelete}
		<ConfirmDialog
			triggerLabel="Eliminar"
			triggerVariant="destructive"
			triggerClass="w-full"
			title={messages.deleteTitle}
			confirmLabel="Eliminar"
			action={actions?.delete ?? '?/delete'}
		>
			{messages.deleteBody}
		</ConfirmDialog>
	{/if}
</div>

<style>
	.note {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		text-align: center;
	}

	.actions {
		display: grid;
		gap: var(--space-3);
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
