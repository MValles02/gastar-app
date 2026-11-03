import { toast } from 'svelte-sonner';
import { invalidateAll } from '$app/navigation';

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Success toast with a single "Deshacer" action: runs `undo`, then refreshes the loads. A failed undo
 * shows an error toast; a successful one adds none.
 */
export function undoToast(message: string, undo: () => Promise<void>) {
	toast.success(message, {
		duration: 5000,
		action: {
			label: 'Deshacer',
			onClick: async () => {
				try {
					await undo();
					await invalidateAll();
				} catch {
					toast.error('No se pudo deshacer.');
				}
			}
		}
	});
}

/** Posts an existing form action the way `use:enhance` does; throws unless it answered with a redirect or success. */
async function postAction(path: string) {
	const res = await fetch(path, {
		method: 'POST',
		body: new FormData(),
		headers: { 'x-sveltekit-action': 'true' }
	});
	const result = (await res.json()) as { type?: string };
	if (result.type !== 'redirect' && result.type !== 'success') throw new Error(path);
}

/** "Movimiento guardado." with Deshacer: deletes the movement (and the rule a repeat save created) through the existing delete actions. */
export function undoMovementSaved(id: string, ruleId?: string | null) {
	// The rule id comes from the URL: only a UUID reaches the fetch path.
	const rule = ruleId && UUID.test(ruleId) ? ruleId : null;
	undoToast('Movimiento guardado.', async () => {
		await postAction(`/movements/${id}?/delete`);
		if (rule) await postAction(`/plan/recurring/${rule}?/delete`);
	});
}
