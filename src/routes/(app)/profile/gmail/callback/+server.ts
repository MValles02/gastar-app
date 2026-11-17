import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import {
	exchangeCode,
	gmailOauthEnabled,
	OAUTH_COOKIE,
	OAUTH_PATH
} from '#lib/server/imports/gmail/oauth.ts';
import { requireUser } from '#lib/server/guards.ts';
import { isBlocked } from '#lib/server/rate-limit.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	if (!gmailOauthEnabled()) error(404);
	const raw = cookies.get(OAUTH_COOKIE);
	cookies.delete(OAUTH_COOKIE, { path: OAUTH_PATH, secure: !dev });
	function back(query: string): never {
		redirect(303, `${OAUTH_PATH}?${query}`);
	}
	const userId = requireUser(locals).id;
	if (isBlocked('oauthStart', userId)) back('error=rate');

	let saved: { userId?: unknown; state?: unknown; verifier?: unknown } = {};
	try {
		saved = JSON.parse(raw ?? '');
	} catch {
		// Missing or malformed cookie: handled below as a state error.
	}
	const state = url.searchParams.get('state');
	if (
		typeof saved.state !== 'string' ||
		typeof saved.verifier !== 'string' ||
		!state ||
		state !== saved.state ||
		saved.userId !== userId
	) {
		back('error=state');
	}
	if (url.searchParams.get('error')) back('error=denied');
	const code = url.searchParams.get('code');
	let result: Awaited<ReturnType<typeof exchangeCode>> = 'exchange';
	if (code) {
		try {
			result = await exchangeCode(userId, code, saved.verifier as string, url.origin);
		} catch {
			// Nothing from the error is logged or put in the URL: it may carry token material.
		}
	}
	back(result === 'ok' ? 'linked=1' : `error=${result}`);
};
