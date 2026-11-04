import { deserialize } from '$app/forms';
import { refreshAll } from '$app/navigation';
import type { ActionResult } from '@sveltejs/kit';
import { toast } from 'svelte-sonner';

const UNSAVED = 'No se pudo guardar el cambio.';

/** Posts `fields` to a form action the way `use:enhance` does and returns the parsed result. */
export async function submitAction(
	path: string,
	fields: Record<string, string>
): Promise<ActionResult> {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	const res = await fetch(path, {
		method: 'POST',
		body,
		headers: { 'x-sveltekit-action': 'true' }
	});
	return deserialize(await res.text());
}

/**
 * Saves one change on its own. Success: `apply(data)`, refresh the loads and show a "Deshacer" toast
 * whose undo posts `previous` through the same action. Failure: returns the first error message
 * (the caller shows it and keeps the old value, no toast); null when saved.
 */
export async function autosave<T>({
	path,
	fields,
	previous,
	message = 'Cambio guardado.',
	apply
}: {
	/** Action URL, e.g. `/movements/<id>?/update`. */
	path: string;
	fields: Record<string, string>;
	/** The same fields as they were before the change. */
	previous: Record<string, string>;
	message?: string;
	apply: (data: T) => void;
}): Promise<string | null> {
	let result: ActionResult;
	try {
		result = await submitAction(path, fields);
	} catch {
		return UNSAVED;
	}
	if (result.type === 'failure') {
		const errors = (result.data as { errors?: Record<string, string> } | undefined)?.errors;
		return Object.values(errors ?? {})[0] ?? UNSAVED;
	}
	if (result.type !== 'success') return UNSAVED;

	apply(result.data as T);
	// Not `undoToast`: it refreshes with `invalidateAll`, which resets the shallow-route state and
	// would close the drawer this is called from. `refreshAll` keeps it.
	toast.success(message, {
		duration: 5000,
		action: {
			label: 'Deshacer',
			onClick: async () => {
				try {
					const undone = await submitAction(path, { ...previous, undo: '1' });
					if (undone.type !== 'success') throw new Error(path);
					apply(undone.data as T);
					await refreshAll();
				} catch {
					toast.error('No se pudo deshacer.');
				}
			}
		}
	});
	await refreshAll();
	return null;
}
