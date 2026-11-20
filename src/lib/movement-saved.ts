import { toast } from 'svelte-sonner';
import { afterNavigate } from '$app/navigation';
import { submitAction } from '#lib/autosave.ts';
import { DELETE_ACTION } from '#lib/form-routes.ts';
import { stripFlags } from '#lib/nav-stack.svelte.ts';
import { looksLikeUuid } from '#lib/toast-flags.ts';
import { undoToast } from '#lib/undo-toast.ts';

/** Posts an existing form action the way `use:enhance` does; throws unless it answered with a redirect or success. */
async function postAction(path: string) {
	const result = await submitAction(path, {});
	if (result.type !== 'redirect' && result.type !== 'success') throw new Error(path);
}

/** "Movimiento guardado." with Deshacer: deletes the movement (and the rule a repeat save created) through the existing delete actions. */
export function undoMovementSaved(id: string, ruleId?: string | null) {
	// The rule id comes from the URL: only a UUID reaches the fetch path.
	const rule = ruleId && looksLikeUuid(ruleId) ? ruleId : null;
	undoToast('Movimiento guardado.', async () => {
		await postAction(DELETE_ACTION.movement(id));
		if (rule) await postAction(DELETE_ACTION.recurring(rule));
	});
}

/**
 * The toast for the saved-movement flag a new-movement save leaves on the URL (`read` gives it; a null
 * id when there is none). Call during component init: after each navigation it toasts once per saved
 * id, however many navigations land before the flag is stripped (with Deshacer when the id looks like
 * one, else a plain toast), runs `shown`, then strips the toast flags so a reload does not toast again.
 */
export function toastSavedMovement(
	read: () => { id: string | null; ruleId: string | null },
	shown?: (id: string) => void
) {
	let toasted: string | null = null;
	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return;
		const { id, ruleId } = read();
		if (!id) return;
		if (id !== toasted) {
			toasted = id;
			if (looksLikeUuid(id)) undoMovementSaved(id, ruleId);
			else toast.success('Movimiento guardado.');
			shown?.(id);
		}
		void stripFlags();
	});
}
