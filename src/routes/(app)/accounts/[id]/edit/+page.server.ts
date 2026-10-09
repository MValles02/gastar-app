import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import {
	CURRENCY_LOCKED_MESSAGE,
	parseAccountForm,
	type AccountFormErrors
} from '$lib/server/accounts';
import { getAccount, isAccountReferenced, updateAccount } from '$lib/server/accounts-queries';
import { ARS_WHOLE_MESSAGE, formatAmountInput, isWholeFor } from '$lib/money';

const { notFound, requireId } = notFoundHelpers('Cuenta no encontrada.');

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	requireId(params.id);
	const [account] = await getAccount(userId, params.id);
	if (!account) notFound();
	const referenced = await isAccountReferenced(userId, account.id);
	return {
		id: account.id,
		name: account.name,
		currencyLocked: referenced,
		values: {
			name: account.name,
			currency: account.currency,
			initialBalance: formatAmountInput(account.initialBalance, account.currency),
			icon: account.icon,
			color: account.color
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		requireId(params.id);
		const parsed = parseAccountForm(await request.formData(), 'edit');
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const [account] = await getAccount(userId, params.id);
		if (!account) notFound();
		const currency = parsed.data.currency ?? account.currency;
		const failWith = (errors: AccountFormErrors) =>
			fail(400, { values: { ...parsed.values, currency }, errors });
		if (!isWholeFor(parsed.data.initialBalance, currency))
			return failWith({ initialBalance: ARS_WHOLE_MESSAGE });

		const rows = await updateAccount(userId, params.id, parsed.data);
		if (rows.length === 0) {
			// Still exists for this user: the atomic currency lock (no currency change once referenced) rejected it.
			if ((await getAccount(userId, params.id)).length > 0)
				return failWith({ currency: CURRENCY_LOCKED_MESSAGE });
			notFound();
		}
		redirect(303, `/accounts/${params.id}`);
	}
};
