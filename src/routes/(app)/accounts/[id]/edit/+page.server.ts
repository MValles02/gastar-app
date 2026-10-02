import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	CURRENCY_LOCKED_MESSAGE,
	currencyChangeAllowed,
	isUuid,
	parseAccountForm
} from '$lib/server/accounts';
import { accountReferenced, getAccount, updateAccount } from '$lib/server/accounts-queries';
import { formatAmountInput } from '$lib/money';

const notFound = () => error(404, 'Cuenta no encontrada.');

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	if (!isUuid(params.id)) notFound();
	const [account] = await getAccount(userId, params.id);
	if (!account) notFound();
	const referenced = (await accountReferenced(userId, account.id)).length > 0;
	return {
		id: account.id,
		name: account.name,
		currencyLocked: referenced,
		values: {
			name: account.name,
			currency: account.currency,
			initialBalance: formatAmountInput(account.initialBalance),
			icon: account.icon,
			color: account.color
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		if (!isUuid(params.id)) notFound();
		const fd = await request.formData();
		const parsed = parseAccountForm(fd, 'edit');
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const [account] = await getAccount(userId, params.id);
		if (!account) notFound();
		const lockedFail = () =>
			fail(400, {
				values: {
					name: String(fd.get('name') ?? ''),
					currency: parsed.data.currency ?? account.currency,
					initialBalance: String(fd.get('initialBalance') ?? ''),
					icon: parsed.data.icon,
					color: parsed.data.color
				},
				errors: { currency: CURRENCY_LOCKED_MESSAGE }
			});

		if (parsed.data.currency) {
			const referenced = (await accountReferenced(userId, account.id)).length > 0;
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
