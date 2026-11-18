import { error } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { accountOption } from '#lib/server/accounts/queries.ts';
import { ACCOUNT_ERRORS } from '#lib/server/imports/card-alerts.ts';
import { activeAccountsIn } from '#lib/server/imports/connections.ts';
import { MP_LINK, mpConnection, mpOauthEnabled } from '#lib/server/imports/mercado-pago/oauth.ts';
import { connectAction, disconnectAction, linkFlash } from '#lib/server/imports/oauth-link.ts';
import { MP_CURRENCY, setReceivingAccount } from '#lib/server/imports/mercado-pago/settings.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!mpOauthEnabled()) error(404);
	const userId = requireUser(locals).id;
	return {
		connection: await mpConnection(userId),
		accounts: (await activeAccountsIn(userId, MP_CURRENCY)).map(accountOption),
		...linkFlash(MP_LINK, url)
	};
};

export const actions: Actions = {
	connect: connectAction(MP_LINK),

	/** Autosaved: answers with the stored value (an undo posts the previous one the same way). */
	account: async ({ locals, request }) => {
		if (!mpOauthEnabled()) error(404);
		const accountId = String((await request.formData()).get('accountId') ?? '');
		if (!(await setReceivingAccount(requireUser(locals).id, accountId))) {
			return formFail(400, { errors: { accountId: ACCOUNT_ERRORS[MP_CURRENCY] } });
		}
		return { accountId };
	},

	disconnect: disconnectAction(MP_LINK)
};
