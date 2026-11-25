<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, refreshAll } from '$app/navigation';
	import { isModifiedClick, openShallow } from '#lib/open-shallow.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { closeAfterDelete, formScreen } from '#lib/components/forms/form-enhance.ts';
	import Icon from '#lib/components/Icon.svelte';

	/**
	 * A detail screen's bottom: the action's error, a muted note, then Ver movimientos (`movementsHref`),
	 * Archivar (behind a confirm) / Desarchivar (a plain enhanced post, so it works without JS) and
	 * Eliminar behind a confirm. Each screen passes its own copy; `actions` overrides the action paths.
	 *
	 * As a drawer (the enclosing FormScreen says so) the actions post to `path` (the URL stays the list's),
	 * an archive change reloads the drawer in place (`sheet` is its shallow-route key), a delete closes it,
	 * Ver movimientos replaces the drawer's history entry with the movements list, and Listo closes it.
	 */
	let {
		path,
		sheet,
		can,
		messages,
		actions,
		formError,
		note,
		movementsHref
	}: {
		/** The detail route, resolved: the actions' base and the drawer's reload target. */
		path: string;
		sheet: keyof App.PageState;
		can: { canArchive: boolean; canUnarchive: boolean; canDelete: boolean };
		messages: {
			archive: string;
			archiveTitle: string;
			archiveBody: string;
			unarchive: string;
			deleteTitle: string;
			deleteBody: string;
		};
		actions?: { archive?: string; unarchive?: string; delete?: string };
		/** Page: the failed action's message (`form.formError`). */
		formError?: string | null;
		note?: string | null;
		movementsHref?: string;
	} = $props();

	const screen = formScreen();
	const drawer = screen.variant === 'drawer';
	const onclose = () => screen.onclose?.();

	let failed = $state('');
	const error = $derived(failed || formError);

	/** Drawer: an archive change's answer. Success reloads the list behind, then this drawer's data. */
	async function changed(type: string) {
		if (type !== 'success') return void (failed = 'No se pudo guardar el cambio.');
		failed = '';
		await refreshAll();
		await openShallow(null, path, sheet, { replace: true });
	}

	const deleted = closeAfterDelete(onclose, () => (failed = 'No se pudo eliminar.'));

	async function viewMovements(e: MouseEvent) {
		if (!drawer || !movementsHref || isModifiedClick(e)) return;
		e.preventDefault();
		// Close first (pops the drawer's shallow entry), then push the list: back returns to the screen
		// the drawer was opened from. Replacing the shallow entry instead would keep its navigation index,
		// and back would then change the URL without leaving the movements list.
		const popped = new Promise((r) => addEventListener('popstate', r, { once: true }));
		onclose();
		await popped;
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved href
		await goto(movementsHref);
	}
</script>

{#if error}
	<p class="error" role="alert"><Icon name="alert" size="1rem" />{error}</p>
{/if}

{#if note}<p class="note">{note}</p>{/if}

<div class="actions">
	{#if movementsHref}
		<Button href={movementsHref} variant="outline" class="w-full" onclick={viewMovements}
			>Ver movimientos</Button
		>
	{/if}
	{#if can.canArchive}
		<ConfirmDialog
			triggerLabel={messages.archive}
			triggerClass="w-full"
			title={messages.archiveTitle}
			confirmLabel={messages.archive}
			confirmVariant="default"
			action={actions?.archive ?? `${path}?/archive`}
			closeOnFailure
			ondone={drawer ? changed : undefined}
		>
			{messages.archiveBody}
		</ConfirmDialog>
	{/if}
	{#if can.canUnarchive}
		<form
			method="POST"
			action={actions?.unarchive ?? `${path}?/unarchive`}
			use:enhance={() =>
				async ({ result, update }) =>
					drawer ? changed(result.type) : update()}
		>
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
			action={actions?.delete ?? `${path}?/delete`}
			closeOnFailure={drawer}
			ondone={drawer ? deleted : undefined}
		>
			{messages.deleteBody}
		</ConfirmDialog>
	{/if}
	{#if drawer}
		<Button class="w-full" onclick={onclose}>Listo</Button>
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
