import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { deleteImportData, getImportAccount } from '$lib/server/mp-import-queries';
import type { RequestHandler } from './$types';

/** Dev/E2E only: wipes the configured owner's import items, rules and sync state. */
export const POST: RequestHandler = async ({ locals }) => {
	if (!(dev || import.meta.env.VITE_E2E === '1') || !locals.user) error(404, 'Not found');
	const account = await getImportAccount(locals.user.id);
	if (!account) error(404, 'Not found');
	await deleteImportData(locals.user.id, account.id);
	return new Response(null, { status: 204 });
};
