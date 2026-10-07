import { alerts } from '$lib/server/alerts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const groups = await alerts(locals.user!.id);
	return { groups: groups.filter((g) => g.items.length > 0) };
};
