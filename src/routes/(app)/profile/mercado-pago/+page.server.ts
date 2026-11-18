import { error, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { dev } from '$app/env';
import { accountOption } from '#lib/server/accounts/queries.ts';
import { ACCOUNT_ERRORS } from '#lib/server/imports/card-alerts.ts';
import { activeAccountsIn, getConnectionInfo } from '#lib/server/imports/connections.ts';
import {
	deleteConnection,
	mpOauthEnabled,
	OAUTH_COOKIE,
	OAUTH_PATH,
	startAuthorization
} from '#lib/server/imports/mercado-pago/oauth.ts';
import { MP_CURRENCY, setReceivingAccount } from '#lib/server/imports/mercado-pago/settings.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

const FLASHES = {
	denied: 'Cancelaste la vinculación.',
	state: 'La vinculación venció. Probá de nuevo.',
	exchange: 'Mercado Pago no respondió. Probá de nuevo.'
} as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!mpOauthEnabled()) error(404);
	const userId = requireUser(locals).id;
	const code = url.searchParams.get('error');
	const connection = await getConnectionInfo(userId);
	return {
		connection,
		accounts: (await activeAccountsIn(userId, MP_CURRENCY)).map(accountOption),
		linked: url.searchParams.get('linked') === '1',
		flash: code && code in FLASHES ? FLASHES[code as keyof typeof FLASHES] : null
	};
};

export const actions: Actions = {
	connect: async ({ locals, cookies, url }) => {
		if (!mpOauthEnabled()) error(404);
		const { state, verifier, url: authorizeUrl } = startAuthorization(url.origin);
		cookies.set(OAUTH_COOKIE, JSON.stringify({ userId: requireUser(locals).id, state, verifier }), {
			path: OAUTH_PATH,
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 600
		});
		// Mercado Pago's OAuth page: the only external redirect, allowed by origin.
		redirect(303, authorizeUrl, { external: [new URL(authorizeUrl).origin] });
	},

	/** Autosaved: answers with the stored value (an undo posts the previous one the same way). */
	account: async ({ locals, request }) => {
		if (!mpOauthEnabled()) error(404);
		const accountId = String((await request.formData()).get('accountId') ?? '');
		if (!(await setReceivingAccount(requireUser(locals).id, accountId))) {
			return formFail(400, { errors: { accountId: ACCOUNT_ERRORS[MP_CURRENCY] } });
		}
		return { accountId };
	},

	disconnect: async ({ locals }) => {
		if (!mpOauthEnabled()) error(404);
		await deleteConnection(requireUser(locals).id);
		redirect(303, OAUTH_PATH);
	}
};
