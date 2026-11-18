import { getContext, setContext, tick } from 'svelte';
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
 * What a FormScreen shares with the form inside it: FormShell reads it as the defaults for its
 * `variant`, `onclose`, `onsaved` and `cancelHref` (explicit props win), and form components read
 * `variant` to lay themselves out for the drawer.
 */
export type FormScreenContext = {
	variant: 'page' | 'drawer';
	/** The page's close target: Cancelar goes there. */
	cancelHref?: string;
	/** Drawer: closes it. */
	onclose?: () => void;
	/** Drawer: the action redirected to `location` (the save succeeded). */
	onsaved?: (location: string) => unknown;
};

const FORM_SCREEN = Symbol('form-screen');

export const setFormScreen = (screen: FormScreenContext) => setContext(FORM_SCREEN, screen);

/** The enclosing FormScreen's context; a form outside one is a page form. */
export const formScreen = (): FormScreenContext =>
	getContext<FormScreenContext | undefined>(FORM_SCREEN) ?? { variant: 'page' };

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
