import { formFail } from '#lib/form.ts';
import { accountOption } from '#lib/server/accounts/queries.ts';
import { str } from '#lib/server/forms.ts';
import { ACCOUNT_ERRORS, activeAccountsIn } from '#lib/server/imports/connections.ts';
import { MP_LINK, mpConnection } from '#lib/server/imports/mercado-pago/oauth.ts';
import { connectAction, disconnectAction, linkFlash } from '#lib/server/imports/oauth-link.ts';
import { MP_CURRENCY, setReceivingAccount } from '#lib/server/imports/mercado-pago/settings.ts';
import { requireUser } from '#lib/server/guards.ts';
import { linkActions, whenLinkEnabled } from '../link-guard.server.ts';
import type { Actions, PageServerLoad } from './$types';

export const load = whenLinkEnabled(MP_LINK, (async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	return {
		connection: await mpConnection(userId),
		accounts: (await activeAccountsIn(userId, MP_CURRENCY)).map(accountOption),
		...linkFlash(MP_LINK, url)
	};
}) satisfies PageServerLoad);

export const actions = linkActions(MP_LINK, {
	connect: connectAction(MP_LINK),

	/** Autosaved: answers with the stored value (an undo posts the previous one the same way). */
	account: async ({ locals, request }) => {
		const accountId = str(await request.formData(), 'accountId');
		if (!(await setReceivingAccount(requireUser(locals).id, accountId))) {
			return formFail(400, { errors: { accountId: ACCOUNT_ERRORS[MP_CURRENCY] } });
		}
		return { accountId };
	},

	disconnect: disconnectAction(MP_LINK)
} satisfies Actions);
