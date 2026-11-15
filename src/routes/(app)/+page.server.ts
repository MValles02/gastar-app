import { requireUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';
import { preferredCurrency } from '$lib/server/currency-pref';
import { homeView } from '$lib/server/dashboard/home';

export const load: PageServerLoad = async ({ locals, cookies }) =>
	homeView(requireUser(locals).id, preferredCurrency(cookies), new Date());
