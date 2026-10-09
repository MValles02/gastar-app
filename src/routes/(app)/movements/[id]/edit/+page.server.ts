import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { formatAmountInput } from '$lib/money';
import { localDay } from '$lib/server/month';
import { parseMovementForm } from '$lib/server/movements';
import { updateMovement } from '$lib/server/movements-queries';
import {
	failIfUnavailable,
	findMovement,
	keptRefs,
	movementPickers,
	notFound,
	resolvePostedMovement
} from '../../form.server';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	const m = await findMovement(userId, params.id);
	const { accounts, categories } = await movementPickers(userId, keptRefs(m));
	return {
		id: m.id,
		accounts,
		categories,
		values: {
			type: m.type,
			occurredAt: localDay(m.occurredAt),
			description: m.description,
			amount: formatAmountInput(m.amount, m.accountCurrency),
			accountId: m.accountId,
			destinationAccountId: m.destinationAccountId ?? '',
			exchangeRate: m.exchangeRate !== null ? formatAmountInput(m.exchangeRate, 'ARS') : '',
			categoryId: m.categoryId ?? ''
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		const m = await findMovement(userId, params.id);

		const parsed = parseMovementForm(await request.formData());
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
		redirect(303, `/movements/${params.id}`);
	}
};
