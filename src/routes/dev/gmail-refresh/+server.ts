import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { refreshConnection } from '#lib/server/imports/gmail/oauth.ts';
import type { RequestHandler } from './$types';

/** Dev/E2E only: runs the Gmail token refresh for the signed-in user (the sync will be the real caller). */
export const POST: RequestHandler = async ({ locals }) => {
	if (!(dev || import.meta.env.VITE_E2E === '1') || !locals.user) error(404, 'Not found');
	return new Response(await refreshConnection(locals.user.id), { status: 200 });
};
