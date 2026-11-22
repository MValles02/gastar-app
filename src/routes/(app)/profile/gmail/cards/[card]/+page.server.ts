import { error, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { readFields } from '#lib/server/forms.ts';
import { creditOnly, getCardForm, parseCardSlug, saveCard } from '#lib/server/imports/cards.ts';
import { cardNetworkName } from '#lib/imports.ts';
import { currencyAccountOptions } from '#lib/server/imports/connections.ts';
import { GMAIL_LINK } from '#lib/server/imports/gmail/oauth.ts';
import { requireUser } from '#lib/server/guards.ts';
import { linkActions, whenLinkEnabled } from '../../../link-guard.server.ts';
import type { Actions, PageServerLoad } from './$types';

/** The one 404 for a card that is not a valid slug or not one of the user's. */
function cardNotFound(): never {
	error(404, 'Tarjeta no encontrada.');
}

/** `visa-0515` into its network and last 4; 404 for anything else. */
function parseCard(param: string) {
	return parseCardSlug(param) ?? cardNotFound();
}

export const load = whenLinkEnabled(GMAIL_LINK, (async ({ locals, params }) => {
	const userId = requireUser(locals).id;
	const { network, last4 } = parseCard(params.card);
	const initial = (await getCardForm(userId, network, last4)) ?? cardNotFound();
	return {
		networkName: cardNetworkName(network),
		creditOnly: creditOnly(network),
		last4,
		initial,
		...(await currencyAccountOptions(userId))
	};
}) satisfies PageServerLoad);

export const actions = linkActions(GMAIL_LINK, {
	save: async ({ locals, params, request }) => {
		const userId = requireUser(locals).id;
		const { network, last4 } = parseCard(params.card);
		const values = readFields(await request.formData(), ['type', 'arsAccountId', 'usdAccountId']);
		const result = await saveCard(userId, { network, last4, ...values });
		if (!result.ok) {
			// No errors means the card is not one of the user's: the same 404 as the page.
			if (Object.keys(result.errors).length === 0) cardNotFound();
			return formFail(400, { values, errors: result.errors });
		}
		redirect(303, '/imports');
	}
} satisfies Actions);
