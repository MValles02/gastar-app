import { error, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { readFields } from '#lib/server/forms.ts';
import { accountOption } from '#lib/server/accounts/queries.ts';
import { activeAccountsIn, getGaliciaConnection } from '#lib/server/imports/connections.ts';
import { getCard, saveCard } from '#lib/server/imports/gmail/cards.ts';
import { gmailOauthEnabled } from '#lib/server/imports/gmail/oauth.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

/** `visa-0515` into its network and last 4; 404 for anything else. */
function parseCard(param: string) {
	const m = /^(visa)-(\d{4})$/.exec(param);
	if (!m) error(404, 'Tarjeta no encontrada.');
	return { network: m[1], last4: m[2] };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!gmailOauthEnabled()) error(404);
	const userId = requireUser(locals).id;
	const { network, last4 } = parseCard(params.card);
	const card = await getCard(userId, network, last4);
	if (!card) error(404, 'Tarjeta no encontrada.');
	const [ars, usd, galicia] = await Promise.all([
		activeAccountsIn(userId, 'ARS'),
		activeAccountsIn(userId, 'USD'),
		getGaliciaConnection(userId)
	]);
	// A credit card's accounts are the Banco Galicia ones; a card not saved yet starts from them too.
	const accounts = card.type === 'credit' ? galicia : card;
	return {
		last4,
		initial: {
			type: card.type ?? '',
			arsAccountId: accounts?.arsAccountId ?? galicia?.arsAccountId ?? '',
			usdAccountId: accounts?.usdAccountId ?? galicia?.usdAccountId ?? ''
		},
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
