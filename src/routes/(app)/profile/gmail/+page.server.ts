import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { listCards } from '#lib/server/imports/gmail/cards.ts';
import {
	gmailOauthEnabled,
	gmailSummary,
	OAUTH_COOKIE,
	OAUTH_PATH,
	startAuthorization,
	unlinkGmail
} from '#lib/server/imports/gmail/oauth.ts';
import { requireUser } from '#lib/server/guards.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

const FLASHES = {
	denied: 'Cancelaste la vinculación.',
	state: 'La vinculación venció. Probá de nuevo.',
	scope: 'Para vincular Gmail tenés que permitir que Gastar lea tus mails.',
	exchange: 'Google no respondió. Probá de nuevo.',
	rate: 'Demasiados intentos. Probá de nuevo en un minuto.'
} as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!gmailOauthEnabled()) error(404);
	const code = url.searchParams.get('error');
	const userId = requireUser(locals).id;
	const connection = await gmailSummary(userId);
	return {
		connection,
		cards: connection ? await listCards(userId) : [],
		linked: url.searchParams.get('linked') === '1',
		flash: code && code in FLASHES ? FLASHES[code as keyof typeof FLASHES] : null
	};
};

export const actions: Actions = {
	connect: async ({ locals, cookies, url }) => {
		if (!gmailOauthEnabled()) error(404);
		const user = requireUser(locals);
		if (isBlocked('oauthStart', user.id)) redirect(303, `${OAUTH_PATH}?error=rate`);
		record('oauthStart', user.id);
		const { state, verifier, url: authorizeUrl } = await startAuthorization(url.origin, user);
		cookies.set(OAUTH_COOKIE, JSON.stringify({ userId: user.id, state, verifier }), {
			path: OAUTH_PATH,
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 600
		});
		// Google's OAuth page: the only external redirect, allowed by origin.
		redirect(303, authorizeUrl, { external: [new URL(authorizeUrl).origin] });
	},

	disconnect: async ({ locals }) => {
		if (!gmailOauthEnabled()) error(404);
		await unlinkGmail(requireUser(locals).id);
		redirect(303, OAUTH_PATH);
	}
};
