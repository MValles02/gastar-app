import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isUuid } from '$lib/server/accounts';
import { dateTimeLabel } from '$lib/server/month';
import { deleteMovement, getMovement } from '$lib/server/movements-queries';

const notFound = () => error(404, 'Movimiento no encontrado.');

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id)) notFound();
	const [m] = await getMovement(locals.user!.id, params.id);
	if (!m) notFound();
	return {
		movement: {
			id: m.id,
			type: m.type,
			dateLabel: dateTimeLabel(m.occurredAt),
			description: m.description,
			amount: m.amount,
			destinationAmount: m.destinationAmount,
			exchangeRate: m.exchangeRate,
			accountName: m.accountName,
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
		if (!isUuid(params.id)) notFound();
		if ((await getMovement(userId, params.id)).length === 0) notFound();
		if ((await deleteMovement(userId, params.id)).length === 0) notFound();
		redirect(303, '/movements');
	}
};
