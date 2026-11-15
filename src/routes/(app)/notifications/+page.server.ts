import { alerts } from '#lib/server/plan/alerts.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { items: await alerts(requireUser(locals).id) };
};
