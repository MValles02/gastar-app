import { requireUser } from '#lib/server/guards.ts';
import { deleteImportData } from '#lib/server/imports/store.ts';
import { MP_LINK } from '#lib/server/imports/mercado-pago/oauth.ts';
import type { RequestHandler } from './$types';

/** Dev/E2E only (hooks 404s /dev/* elsewhere): wipes the user's import items, rules and sync state, and unlinks their Mercado Pago connection. */
export const POST: RequestHandler = async ({ locals }) => {
	const { id } = requireUser(locals);
	await deleteImportData(id);
	await MP_LINK.unlink(id);
	return new Response(null, { status: 204 });
};
