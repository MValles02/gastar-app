import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { E2E } from '#lib/e2e.ts';
import { refreshConnection } from '#lib/server/imports/gmail/oauth.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	if (!(dev || E2E) || !locals.user) error(404, 'Not found');
	return new Response(await refreshConnection(locals.user.id), { status: 200 });
};
