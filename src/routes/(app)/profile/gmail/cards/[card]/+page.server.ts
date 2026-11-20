import { error, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { readFields } from '#lib/server/forms.ts';
import { creditOnly, getCardForm, parseCardSlug, saveCard } from '#lib/server/imports/cards.ts';
import { cardNetworkName } from '#lib/imports.ts';
import { currencyAccountOptions } from '#lib/server/imports/connections.ts';
import { GMAIL_LINK } from '#lib/server/imports/gmail/oauth.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

/** `visa-0515` into its network and last 4; 404 for anything else. */
function parseCard(param: string) {
	const card = parseCardSlug(param);
	if (!card) error(404, 'Tarjeta no encontrada.');
	return card;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!GMAIL_LINK.enabled()) error(404);
	const userId = requireUser(locals).id;
	const { network, last4 } = parseCard(params.card);
	const initial = await getCardForm(userId, network, last4);
	if (!initial) error(404, 'Tarjeta no encontrada.');
	return {
		networkName: cardNetworkName(network),
		creditOnly: creditOnly(network),
		last4,
		initial,
		...(await currencyAccountOptions(userId))
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		if (!GMAIL_LINK.enabled()) error(404);
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
