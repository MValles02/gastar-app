import { alerts } from '$lib/server/alerts';
import { requireUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { items: await alerts(requireUser(locals).id) };
};
