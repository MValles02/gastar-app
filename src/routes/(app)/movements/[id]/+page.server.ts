import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import type { Actions, PageServerLoad } from './$types';
import { parseMovementForm } from '$lib/server/movements';
import { deleteMovement, updateMovement } from '$lib/server/movements-queries';
import {
	detailOf,
	failIfUnavailable,
	findMovement,
	formValues,
	keptRefs,
	notFound,
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

export const load: PageServerLoad = ({ locals, params }) => detailOf(locals.user!.id, params.id);

export const actions: Actions = {
	/** Saves the posted subset of fields over the stored values, with today's validation. */
	update: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
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
		return { movement: (await detailOf(userId, params.id)).movement };
	},
	delete: async ({ locals, params }) => {
		const userId = locals.user!.id;
		await findMovement(userId, params.id);
		if ((await deleteMovement(userId, params.id)).length === 0) notFound();
		redirect(303, '/movements');
	}
};
