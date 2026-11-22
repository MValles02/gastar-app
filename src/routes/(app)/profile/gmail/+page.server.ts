import { listCards } from '#lib/server/imports/cards.ts';
import { GMAIL_LINK, gmailConnection } from '#lib/server/imports/gmail/oauth.ts';
import { connectAction, disconnectAction, linkFlash } from '#lib/server/imports/oauth-link.ts';
import { requireUser } from '#lib/server/guards.ts';
import { linkActions, whenLinkEnabled } from '../link-guard.server.ts';
import type { Actions, PageServerLoad } from './$types';

export const load = whenLinkEnabled(GMAIL_LINK, (async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const conn = await gmailConnection(userId);
	return {
		connection: conn && { email: conn.email, needsReconnect: conn.needsReconnect },
		cards: conn ? await listCards(userId) : [],
		...linkFlash(GMAIL_LINK, url)
	};
}) satisfies PageServerLoad);

export const actions = linkActions(GMAIL_LINK, {
	connect: connectAction(GMAIL_LINK),
	disconnect: disconnectAction(GMAIL_LINK)
} satisfies Actions);
