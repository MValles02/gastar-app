import { tick } from 'svelte';
import { toast } from 'svelte-sonner';
import { refreshAll } from '$app/navigation';

/** After a failed submit, focus the first invalid field (inputs, or picker triggers showing an error). */
export function focusFirstError(root: ParentNode = document) {
	return tick().then(() =>
		root
			.querySelector<HTMLElement>(
				'form [aria-invalid="true"], form button[aria-describedby$="-error"]'
			)
			?.focus()
	);
}

/**
 * A drawer form's `onsaved`: refreshes the loads, closes the drawer, then toasts. The refresh runs
 * before the pop, because a popstate landing first reuses the stale loads; `refreshAll` keeps the
 * shallow-route state (invalidateAll would reset it).
 */
export function closeAfterSave(onclose: () => void, message = 'Guardado.') {
	return async () => {
		await refreshAll();
		onclose();
		toast.success(message);
	};
}
