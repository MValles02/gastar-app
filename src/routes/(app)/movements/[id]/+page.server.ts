import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { editedForm, parseMovementForm } from '#lib/server/movements/form.ts';
import { str, undoArchivedOk } from '#lib/server/forms.ts';
import { isUuid } from '#lib/server/db/util.ts';
import { deleteMovement, setMovementRule, updateMovement } from '#lib/server/movements/queries.ts';
import { requireUser } from '#lib/server/guards.ts';
import {
	detailOf,
	failIfUnavailable,
	findMovement,
	keptRefs,
	notFound,
	requireId,
	savedSlice
} from '#lib/server/movements/detail.ts';
import { resolvePostedMovement } from '#lib/server/movements/pickers.ts';

export const load: PageServerLoad = ({ locals, params }) =>
	detailOf(requireUser(locals).id, params.id);

export const actions: Actions = {
	/** Saves the posted subset of fields over the stored values, with today's validation. */
	update: async ({ request, locals, params }) => {
		const userId = requireUser(locals).id;
		const m = await findMovement(userId, params.id);
		const posted = await request.formData();
		const parsed = parseMovementForm(editedForm(m, posted));
		const { values } = parsed;
		if (!parsed.ok) return formFail(400, { values, errors: parsed.errors });

		// An undo may restore the archived refs the movement had; rows still come from the owner-scoped getAccount/getCategory.
		const kept = keptRefs(m);
		const archivedOk = undoArchivedOk(posted, ['accountId', 'destinationAccountId', 'categoryId']);
		const keep = archivedOk ? { ...kept, archivedOk } : kept;
		const { resolved } = await resolvePostedMovement(userId, parsed.data, keep);
		if (!resolved.ok) return formFail(400, { values, errors: resolved.errors });

		let rows;
		try {
			rows = await updateMovement(userId, params.id, resolved.row);
		} catch (e) {
			return failIfUnavailable(e, values);
		}
		if (rows.length === 0) notFound();
		return await savedSlice(userId, params.id);
	},
	/** Links the movement to a fixed payment (recurringId) or unlinks it (empty). */
	link: async ({ request, locals, params }) => {
		const userId = requireUser(locals).id;
		const recurringId = str(await request.formData(), 'recurringId');
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
		return await savedSlice(userId, params.id);
	},
	delete: async ({ locals, params }) => {
		const userId = requireUser(locals).id;
		requireId(params.id);
		if ((await deleteMovement(userId, params.id)).length === 0) notFound();
		redirect(303, '/movements');
	}
};
