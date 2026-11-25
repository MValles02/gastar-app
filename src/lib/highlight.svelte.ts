/** The movement to flash in lists after it was just saved (Inicio and Movimientos read it). */
export const highlight = $state<{ id: string | null }>({ id: null });

let timer: ReturnType<typeof setTimeout> | undefined;

/** Flags `id` for `ms`; a newer call replaces the previous one. */
export function highlightMovement(id: string, ms = 1500) {
	highlight.id = id;
	clearTimeout(timer);
	timer = setTimeout(() => (highlight.id = null), ms);
}
