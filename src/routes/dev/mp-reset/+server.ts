import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { E2E } from '#lib/e2e.ts';
import { deleteImportData } from '#lib/server/imports/store.ts';
import { MP_LINK } from '#lib/server/imports/mercado-pago/oauth.ts';
import type { RequestHandler } from './$types';

/** Dev/E2E only: wipes the user's import items, rules and sync state, and unlinks their Mercado Pago connection. */
export const POST: RequestHandler = async ({ locals }) => {
	if (!(dev || E2E) || !locals.user) error(404, 'Not found');
	await deleteImportData(locals.user.id);
	await MP_LINK.unlink(locals.user.id);
	return new Response(null, { status: 204 });
};
