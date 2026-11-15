/**
 * One-shot URL flags: a save leaves them on the screen it lands on, the screen reads them once
 * (toast, highlight, drawer) and `stripFlags` drops them. Written and read only here.
 */

/** Read-only search params (`page.url`'s are read-only). */
type Flags = Pick<URLSearchParams, 'get'>;

/** Toast flags a save leaves on the URL: dropped from a return path, stripped once shown. */
export const TOAST_FLAGS = ['saved', 'planSaved', 'movementSaved', 'rule'] as const;

/**
 * Loose id check for a flag the client acts on: 36 hex digits and dashes. The server's strict
 * check is `isUuid` (`#lib/server/db/util.ts`); the two are kept apart on purpose.
 */
export const looksLikeUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);

/**
 * Where a new-movement save goes: `path` with the saved movement (and the rule "Repetir todos los
 * meses" created) as `key`: `saved` on the form itself, `movementSaved` on the screen it returns to.
 */
export function withSavedMovement(
	path: string,
	key: 'saved' | 'movementSaved',
	id: string,
	ruleId: string | null
) {
	const flags = `${key}=${id}${ruleId ? `&rule=${ruleId}` : ''}`;
	return `${path}${path.includes('?') ? '&' : '?'}${flags}`;
}

/** The saved movement (and its rule) a new-movement save left as `key`; null ids when absent. */
export const savedMovement = (sp: Flags, key: 'saved' | 'movementSaved') => ({
	id: sp.get(key) || null,
	ruleId: sp.get('rule') || null
});

/** Where the plan wizard's last step lands: the plan, with `?planSaved=1`. */
export const PLAN_SAVED_HREF = '/plan?planSaved=1';
export const isPlanSaved = (sp: Flags) => sp.get('planSaved') === '1';

/** An alert's `?limit=<categoryId>`: the limit drawer to open, when it looks like an id. */
export function limitFlag(sp: Flags) {
	const limit = sp.get('limit');
	return limit && looksLikeUuid(limit) ? limit : null;
}

/** The import review's outcome, as `/imports?done=`. */
export type ImportDone = 'approved' | 'rejected' | 'stale';
export const IMPORT_DONE = ['approved', 'rejected', 'stale'] as const satisfies ImportDone[];
export const importDoneHref = (done: string) => `/imports?done=${done}`;
/** The outcome a review redirect carries (anything but rejected or stale reads as approved). */
export function importDoneOf(location: string): ImportDone {
	const done = new URL(location, 'http://x').searchParams.get('done');
	return done === 'rejected' || done === 'stale' ? done : 'approved';
}

/** The id a create action redirected to (`/<collection>/<id>`). */
export const createdId = (location: string) => location.split('/').pop()!;
