import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { deleteImportData, getImportAccount } from '$lib/server/mp-import-queries';
import { deleteConnection } from '$lib/server/mp-oauth';
import type { RequestHandler } from './$types';

/** Dev/E2E only: wipes the user's import items, rules and sync state, and unlinks their Mercado Pago connection. */
export const POST: RequestHandler = async ({ locals }) => {
	if (!(dev || import.meta.env.VITE_E2E === '1') || !locals.user) error(404, 'Not found');
	const account = await getImportAccount(locals.user.id);
	if (account) await deleteImportData(locals.user.id, account.id);
	await deleteConnection(locals.user.id);
	return new Response(null, { status: 204 });
};
