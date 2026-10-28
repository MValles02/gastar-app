import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { exchangeCode, mpOauthEnabled, OAUTH_COOKIE, OAUTH_PATH } from '$lib/server/mp-oauth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	if (!mpOauthEnabled()) error(404);
	const raw = cookies.get(OAUTH_COOKIE);
	cookies.delete(OAUTH_COOKIE, { path: OAUTH_PATH, secure: !dev });
	function back(query: string): never {
		redirect(303, `${OAUTH_PATH}?${query}`);
	}

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
		saved.userId !== locals.user!.id
	) {
		back('error=state');
	}
	if (url.searchParams.get('error')) back('error=denied');
	const code = url.searchParams.get('code');
	let linked = false;
	try {
		linked =
			!!code && (await exchangeCode(locals.user!.id, code, saved.verifier as string, url.origin));
	} catch {
		// Nothing from the error is logged or put in the URL: it may carry token material.
	}
	if (!linked) back('error=exchange');
	back('linked=1');
};
