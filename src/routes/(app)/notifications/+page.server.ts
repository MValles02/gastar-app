import { alerts } from '$lib/server/alerts';
import { requireUser } from '$lib/server/require-user';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const groups = await alerts(requireUser(locals).id);
	return { groups: groups.filter((g) => g.items.length > 0) };
};
