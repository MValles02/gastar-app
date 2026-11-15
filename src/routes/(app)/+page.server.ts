import { requireUser } from '#lib/server/guards.ts';
import type { PageServerLoad } from './$types';
import { preferredCurrency } from '#lib/server/currency-pref.ts';
import { homeView } from '#lib/server/dashboard/home.ts';

export const load: PageServerLoad = async ({ locals, cookies }) =>
	homeView(requireUser(locals).id, preferredCurrency(cookies), new Date());
