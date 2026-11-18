import { error, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { readFields } from '#lib/server/forms.ts';
import { accountOption } from '#lib/server/accounts/queries.ts';
import { getCardForm, parseCardSlug, saveCard } from '#lib/server/imports/card-alerts.ts';
import { activeAccountsIn } from '#lib/server/imports/connections.ts';
import { gmailOauthEnabled } from '#lib/server/imports/gmail/oauth.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

/** `visa-0515` into its network and last 4; 404 for anything else. */
function parseCard(param: string) {
	const card = parseCardSlug(param);
	if (!card) error(404, 'Tarjeta no encontrada.');
	return card;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!gmailOauthEnabled()) error(404);
	const userId = requireUser(locals).id;
	const { network, last4 } = parseCard(params.card);
	const initial = await getCardForm(userId, network, last4);
	if (!initial) error(404, 'Tarjeta no encontrada.');
	const [ars, usd] = await Promise.all([
		activeAccountsIn(userId, 'ARS'),
		activeAccountsIn(userId, 'USD')
	]);
	return {
		last4,
		initial,
		arsAccounts: ars.map(accountOption),
		usdAccounts: usd.map(accountOption)
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		if (!gmailOauthEnabled()) error(404);
		const userId = requireUser(locals).id;
		const { network, last4 } = parseCard(params.card);
		const values = readFields(await request.formData(), ['type', 'arsAccountId', 'usdAccountId']);
		const result = await saveCard(userId, { network, last4, ...values });
		if (!result.ok) {
			// No errors means the card is not one of the user's: the same 404 as the page.
			if (Object.keys(result.errors).length === 0) error(404, 'Tarjeta no encontrada.');
			return formFail(400, { values, errors: result.errors });
		}
		redirect(303, '/imports');
	}
};
