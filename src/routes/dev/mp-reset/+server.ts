import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { deleteImportData } from '#lib/server/imports/store.ts';
import { MP_LINK } from '#lib/server/imports/mercado-pago/oauth.ts';
import type { RequestHandler } from './$types';

/** Dev/E2E only: wipes the user's import items, rules and sync state, and unlinks their Mercado Pago connection. */
export const POST: RequestHandler = async ({ locals }) => {
	if (!(dev || import.meta.env.VITE_E2E === '1') || !locals.user) error(404, 'Not found');
	await deleteImportData(locals.user.id);
	await MP_LINK.unlink(locals.user.id);
	return new Response(null, { status: 204 });
};
