import { requireUser } from '#lib/server/guards.ts';
import { refreshConnection } from '#lib/server/imports/gmail/oauth.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	return new Response(await refreshConnection(requireUser(locals).id), { status: 200 });
};
