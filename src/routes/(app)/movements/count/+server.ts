import type { RequestHandler } from './$types';
import { countMovements, movementQueryFromUrl } from '#lib/server/movements/filters.ts';
import { requireUser } from '#lib/server/guards.ts';

/** How many movements the URL filters match (the filters drawer's "Ver N movimientos"). */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { query } = movementQueryFromUrl(url);
	return Response.json({ count: await countMovements(requireUser(locals).id, query) });
};
