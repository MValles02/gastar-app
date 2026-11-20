import { error } from '@sveltejs/kit';
import { listCards } from '#lib/server/imports/cards.ts';
import { GMAIL_LINK, gmailConnection } from '#lib/server/imports/gmail/oauth.ts';
import { connectAction, disconnectAction, linkFlash } from '#lib/server/imports/oauth-link.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!GMAIL_LINK.enabled()) error(404);
	const userId = requireUser(locals).id;
	const conn = await gmailConnection(userId);
	return {
		connection: conn && { email: conn.email, needsReconnect: conn.needsReconnect },
		cards: conn ? await listCards(userId) : [],
		...linkFlash(GMAIL_LINK, url)
	};
};

export const actions: Actions = {
	connect: connectAction(GMAIL_LINK),
	disconnect: disconnectAction(GMAIL_LINK)
};
