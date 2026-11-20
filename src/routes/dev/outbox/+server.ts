import { error } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { latestOutbox } from '#lib/server/email.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	if (env.RESEND_API_KEY) error(404, 'Not found');
	return Response.json(latestOutbox(url.searchParams.get('to') ?? '') ?? null);
};
