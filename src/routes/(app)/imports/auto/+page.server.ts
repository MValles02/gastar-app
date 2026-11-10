import { fail } from '@sveltejs/kit';
import { importTitle, listAutoApproved, undoApproval } from '$lib/server/import-queries';
import { formatDay } from '$lib/locale';
import { dayHeading, localDay } from '$lib/server/month';
import { isUuid } from '$lib/server/db/util';
import { requireUser } from '$lib/server/require-user';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const today = localDay(new Date());
	const rows = await listAutoApproved(userId);
	// Short enough to sit beside the category on a phone: "Hoy", "Ayer" or "25/10".
	const shortDate = (ymd: string) => {
		const h = dayHeading(ymd, today);
		return h === 'Hoy' || h === 'Ayer' ? h : formatDay(ymd).slice(0, 5);
	};
	return {
		items: rows.map((i) => ({
			id: i.id,
			title: importTitle(i),
			amount: i.amount,
			currency: i.currency,
			isCredit: i.isCredit,
			date: shortDate(localDay(i.occurredAt)),
			target: i.category ?? i.counterAccount
		}))
	};
};

export const actions: Actions = {
	/** Deshacer of an automatic approval: same as the inbox's, and the item is never auto-approved again. */
	undo: async ({ locals, request }) => {
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
};
