import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { latestOutbox } from '$lib/server/email';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	if (!dev || env.RESEND_API_KEY) error(404, 'Not found');
	return json(latestOutbox(url.searchParams.get('to') ?? '') ?? null);
};
