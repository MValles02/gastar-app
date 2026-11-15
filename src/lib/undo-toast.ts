import { toast } from 'svelte-sonner';
import { refreshAll } from '$app/navigation';
import { submitAction } from './autosave';
import { DELETE_ACTION } from './form-routes';
import { looksLikeUuid } from './toast-flags';

/**
 * Success toast with a single "Deshacer" action: runs `undo`, then refreshes the loads (`refreshAll`, which keeps a shallow-route drawer open). A failed undo
 * shows an error toast; a successful one adds none, and a failed refresh after it is ignored.
 */
export function undoToast(message: string, undo: () => Promise<void>) {
	toast.success(message, {
		duration: 5000,
		action: {
			label: 'Deshacer',
			onClick: async () => {
				try {
					await undo();
				} catch {
					toast.error('No se pudo deshacer.');
					return;
				}
				// The undo went through: a failed refresh is not an undo failure; the next navigation reloads.
				await refreshAll().catch(() => {});
			}
		}
	});
}

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
