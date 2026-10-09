import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	CURRENCY_LOCKED_MESSAGE,
	currencyChangeAllowed,
	parseAccountForm,
	type AccountFormErrors
} from '$lib/server/accounts';
import { isUuid } from '$lib/server/db/util';
import { getAccount, isAccountReferenced, updateAccount } from '$lib/server/accounts-queries';
import { ARS_WHOLE_MESSAGE, formatAmountInput, isWholeFor } from '$lib/money';

const notFound = () => error(404, 'Cuenta no encontrada.');

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	if (!isUuid(params.id)) notFound();
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
		if (!isUuid(params.id)) notFound();
		const parsed = parseAccountForm(await request.formData(), 'edit');
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const [account] = await getAccount(userId, params.id);
		if (!account) notFound();
		const currency = parsed.data.currency ?? account.currency;
		const failWith = (errors: AccountFormErrors) =>
			fail(400, { values: { ...parsed.values, currency }, errors });
		const lockedFail = () => failWith({ currency: CURRENCY_LOCKED_MESSAGE });
		if (!isWholeFor(parsed.data.initialBalance, currency))
			return failWith({ initialBalance: ARS_WHOLE_MESSAGE });

		if (parsed.data.currency) {
			const referenced = await isAccountReferenced(userId, account.id);
			if (!currencyChangeAllowed(account.currency, parsed.data.currency, referenced))
				return lockedFail();
		}

		const rows = await updateAccount(userId, params.id, parsed.data);
		if (rows.length === 0) {
			// Still exists for this user: the atomic currency lock rejected the update.
			if ((await getAccount(userId, params.id)).length > 0) return lockedFail();
			notFound();
		}
		redirect(303, `/accounts/${params.id}`);
	}
};
