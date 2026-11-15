import { fail, type RequestEvent } from '@sveltejs/kit';
import { isUuid } from '../db/util';
import { requireUser } from '../guards';
import { undoApproval } from './store';

/**
 * Deshacer of a quick or automatic approval (inbox and /imports/auto): removes its movement and puts the
 * item back to pending; an undone automatic approval is never auto-approved again.
 */
export async function undoApprovalAction({ locals, request }: RequestEvent) {
	const userId = requireUser(locals).id;
	const id = String((await request.formData()).get('id') ?? '');
	if (!isUuid(id)) return fail(400, { message: 'No se pudo deshacer.' });
	const result = await undoApproval(userId, id);
	if (result === 'changed') {
		return fail(409, { message: 'No se pudo deshacer: el movimiento ya cambió.' });
	}
	if (result === 'stale') return fail(409, { message: 'No se pudo deshacer.' });
	return { undoneId: id };
}
