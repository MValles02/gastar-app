import { fail, redirect } from '@sveltejs/kit';
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

// `type` is never accepted: changing a movement's type is not offered.
const EDITABLE = [
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
		if (!parsed.ok) return fail(400, { values, errors: parsed.errors });

		const { resolved } = await resolvePostedMovement(userId, parsed.data, keptRefs(m));
		if (!resolved.ok) return fail(400, { values, errors: resolved.errors });

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
