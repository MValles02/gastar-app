import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import { fullDateLabel } from '$lib/server/month';
import { deleteMovement, getMovement } from '$lib/server/movements-queries';

const { notFound, requireId } = notFoundHelpers('Movimiento no encontrado.');

export const load: PageServerLoad = async ({ locals, params }) => {
	requireId(params.id);
	const [m] = await getMovement(locals.user!.id, params.id);
	if (!m) notFound();
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
		requireId(params.id);
		if ((await getMovement(userId, params.id)).length === 0) notFound();
		if ((await deleteMovement(userId, params.id)).length === 0) notFound();
		redirect(303, '/movements');
	}
};
