import { dayOfMonth } from '#lib/dates.ts';
import { NEW_MOVEMENT_PATH } from '#lib/movement.ts';
import { TOAST_FLAGS, withSavedMovement } from '#lib/toast-flags.ts';
import { localDay } from '../month';
import { createMovementWithRule } from '../recurring/queries';
import type { MovementRow } from './form';
import { createMovement } from './queries';

/**
 * The screen to return to after saving: a same-origin app path other than the new-movement form,
 * with its toast flags dropped, or null. Anything else (absolute or protocol-relative URLs, another
 * origin) is rejected, so the action can't be turned into an open redirect.
 */
function originPath(value: unknown, base: URL): string | null {
	if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
	let url: URL;
	let path: string;
	try {
		url = new URL(value, base);
		// Compared decoded and without a trailing slash: `/movements/%6Eew/` is this form too.
		path = decodeURIComponent(url.pathname).replace(/\/+$/, '');
	} catch {
		return null;
	}
	// Dot segments can normalize to a protocol-relative path (`/.//evil.com` → `//evil.com`).
	if (url.origin !== base.origin || url.pathname.startsWith('//') || path === NEW_MOVEMENT_PATH)
		return null;
	for (const flag of TOAST_FLAGS) url.searchParams.delete(flag);
	return url.pathname + url.search;
}

/** The page the new-movement form was opened from, by the Referer (no-JS; the client replaces it with its own). */
export function refererPath(request: Request, base: URL) {
	const referer = request.headers.get('referer');
	if (!referer) return null;
	try {
		const url = new URL(referer);
		return url.origin === base.origin ? originPath(url.pathname + url.search, base) : null;
	} catch {
		return null;
	}
}

export function newMovementExtras(fd: FormData, values: Record<string, string>) {
	// Keeps the checkbox state when the form is shown again with errors.
	if (fd.get('repeat') === 'on') values.repeat = 'on';
	// Keeps the origin when the form is shown again with errors (the Referer is now this form).
	const returnTo = fd.get('returnTo');
	if (typeof returnTo === 'string') values.returnTo = returnTo;
}

/**
 * Saves a new movement and its monthly rule when "Repetir todos los meses" is on, and returns where
 * to go: back to the screen the form was opened from (which toasts), else this form for the next one.
 */
export async function createNewMovement(userId: string, row: MovementRow, fd: FormData, base: URL) {
	let movementId: string;
	// Set when "Repetir todos los meses" created a rule: the client's Deshacer removes it too.
	let ruleId: string | null = null;
	const { type, categoryId } = row;
	if (fd.get('repeat') === 'on' && type !== 'transfer' && categoryId) {
		// The rule repeats on the movement's Buenos Aires day (clamped by recurringStatus in short months).
		({ movementId, ruleId } = await createMovementWithRule(userId, row, {
			type,
			description: row.description,
			amount: row.amount,
			accountId: row.accountId,
			categoryId,
			dayOfMonth: dayOfMonth(localDay(row.occurredAt))
		}));
	} else {
		[{ id: movementId }] = await createMovement(userId, row);
	}
	const back = originPath(fd.get('returnTo'), base);
	return back
		? withSavedMovement(back, 'movementSaved', movementId, ruleId)
		: withSavedMovement(NEW_MOVEMENT_PATH, 'saved', movementId, ruleId);
}
