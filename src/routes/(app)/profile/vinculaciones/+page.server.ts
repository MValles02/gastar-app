import { error } from '@sveltejs/kit';
import { importSourcesEnabled } from '$lib/server/import-queries';
import { mpLinkState } from '$lib/server/mp-oauth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!importSourcesEnabled()) error(404, 'No encontrado');
	return { mp: await mpLinkState(locals.user!.id) };
};
