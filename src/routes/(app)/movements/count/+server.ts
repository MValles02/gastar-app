import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { applyDefaultRange, parseMovementFilters } from '$lib/server/movements';
import { summarizeMovements } from '$lib/server/movements-queries';

/** How many movements the URL filters match (the filters drawer's "Ver N movimientos"). */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { query: base } = parseMovementFilters(url.searchParams);
	const { query: parsed } = applyDefaultRange(base, url.searchParams);
	// An explicit account filter wins over ?currency=.
	const query = { ...parsed, currency: parsed.account.length ? ('' as const) : parsed.currency };
	const rows = await summarizeMovements(locals.user!.id, query);
	return json({ count: rows.reduce((a, r) => a + r.count, 0) });
};
