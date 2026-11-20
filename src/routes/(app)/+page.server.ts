import { requireUser } from '#lib/server/guards.ts';
import type { PageServerLoad } from './$types';
import { preferredCurrency } from '#lib/server/currency-pref.ts';
import { homeView } from '#lib/server/dashboard/home.ts';
import { importsPending } from '#lib/server/imports/connections.ts';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const userId = requireUser(locals).id;
	const [view, mpPending] = await Promise.all([
		homeView(userId, preferredCurrency(cookies), new Date()),
		importsPending(userId)
	]);
	// Pending Mercado Pago items; null when not linked or the feature is off.
	return { ...view, mpPending };
};
