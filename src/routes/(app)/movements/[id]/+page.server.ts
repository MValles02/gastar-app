import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { fullDateLabel } from '$lib/server/month';
import { deleteMovement } from '$lib/server/movements-queries';
import { findMovement, notFound } from '../form.server';

export const load: PageServerLoad = async ({ locals, params }) => {
	const m = await findMovement(locals.user!.id, params.id);
	return {
		movement: {
			id: m.id,
			type: m.type,
			dateLabel: fullDateLabel(m.occurredAt),
			description: m.description,
			amount: m.amount,
			destinationAmount: m.destinationAmount,
			exchangeRate: m.exchangeRate,
			accountName: m.accountName,
			accountIcon: m.accountIcon,
			accountColor: m.accountColor,
			accountCurrency: m.accountCurrency,
			accountArchived: m.accountArchivedAt !== null,
			destinationName: m.destinationName,
			destinationCurrency: m.destinationCurrency,
			destinationArchived: m.destinationArchivedAt !== null,
			categoryName: m.categoryName,
			categoryArchived: m.categoryArchivedAt !== null
		}
	};
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		const userId = locals.user!.id;
		await findMovement(userId, params.id);
		if ((await deleteMovement(userId, params.id)).length === 0) notFound();
		redirect(303, '/movements');
	}
};
