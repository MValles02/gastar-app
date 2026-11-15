import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import type { Actions, PageServerLoad } from './$types';
import { parseMovementForm } from '$lib/server/movements';
import { isUuid } from '$lib/server/db/util';
import { deleteMovement, setMovementRule, updateMovement } from '$lib/server/movements-queries';
import { requireUser } from '$lib/server/guards';
import {
	detailOf,
	failIfUnavailable,
	findMovement,
	formValues,
	keptRefs,
	notFound,
	requireId,
	resolvePostedMovement
} from '../form.server';

// Whitelist of posted fields; `type` goes through the same parse/resolve path as every other field.
const EDITABLE = [
	'type',
	'occurredAt',
	'description',
	'amount',
	'accountId',
	'destinationAccountId',
	'categoryId',
	'exchangeRate'
] as const;

export const load: PageServerLoad = ({ locals, params }) =>
	detailOf(requireUser(locals).id, params.id);

export const actions: Actions = {
	/** Saves the posted subset of fields over the stored values, with today's validation. */
	update: async ({ request, locals, params }) => {
		const userId = requireUser(locals).id;
		const m = await findMovement(userId, params.id);

		const posted = await request.formData();
		const fd = new FormData();
		for (const [k, v] of Object.entries(formValues(m))) fd.set(k, v);
		for (const k of EDITABLE) {
			const v = posted.get(k);
			if (typeof v === 'string') fd.set(k, v);
		}

		const parsed = parseMovementForm(fd);
		const { values } = parsed;
		if (!parsed.ok) return formFail(400, { values, errors: parsed.errors });

		// An undo may restore the archived refs the movement had; rows still come from the owner-scoped getAccount/getCategory.
		const kept = keptRefs(m);
		const keep =
			posted.get('undo') === '1'
				? {
						...kept,
						archivedOk: ['accountId', 'destinationAccountId', 'categoryId']
							.map((k) => posted.get(k))
							.filter((v): v is string => typeof v === 'string' && v !== '')
					}
				: kept;
		const { resolved } = await resolvePostedMovement(userId, parsed.data, keep);
		if (!resolved.ok) return formFail(400, { values, errors: resolved.errors });

		let rows;
		try {
			rows = await updateMovement(userId, params.id, resolved.row);
		} catch (e) {
			return failIfUnavailable(e, values);
		}
		if (rows.length === 0) notFound();
		const { movement, rules } = await detailOf(userId, params.id);
		return { movement, rules };
	},
	/** Links the movement to a fixed payment (recurringId) or unlinks it (empty). */
	link: async ({ request, locals, params }) => {
		const userId = requireUser(locals).id;
		const fd = await request.formData();
		const raw = fd.get('recurringId');
		const recurringId = typeof raw === 'string' ? raw : '';
		const values = { recurringId };
		if (recurringId && !isUuid(recurringId))
			return formFail(400, { values, errors: { recurringId: 'Elegí un pago fijo válido.' } });
		const result = await setMovementRule(userId, params.id, recurringId || null);
		if (result === 'missing') notFound();
		if (result === 'taken')
			return formFail(400, {
				values,
				errors: {
					recurringId: 'Ese pago fijo no está disponible o ya tiene un movimiento ese mes.'
				}
			});
		const { movement, rules } = await detailOf(userId, params.id);
		return { movement, rules };
	},
	delete: async ({ locals, params }) => {
		const userId = requireUser(locals).id;
		requireId(params.id);
		if ((await deleteMovement(userId, params.id)).length === 0) notFound();
		redirect(303, '/movements');
	}
};
