import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { planReturn } from '$lib/plan-wizard';
import { formatAmountInput } from '$lib/money';
import { preferredCurrency } from '$lib/server/currency-pref';
import { recurringSuggestions } from '$lib/server/plan-view';
import { createRecurring } from '$lib/server/plan-queries';
import { requireUser } from '$lib/server/require-user';
import { readRecurringForm, recurringPickers } from '../form.server';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const userId = requireUser(locals).id;
	const currency = preferredCurrency(cookies);
	const type =
		url.searchParams.get('type') === 'income' ? ('income' as const) : ('outcome' as const);
	// A suggestion id is recomputed, never trusted: the description and amount are not in the URL.
	const id = url.searchParams.get('suggestion');
	const s =
		id && type === 'outcome'
			? (await recurringSuggestions(userId, currency)).find((c) => c.id === id)
			: undefined;
	return {
		...(await recurringPickers(userId)),
		returnHref: planReturn(url.searchParams.get('wizard')),
		type,
		suggested: s && {
			type: 'outcome',
			description: s.description,
			amount: formatAmountInput(s.amount, currency),
			accountId: s.accountId,
			categoryId: s.categoryId,
			dayOfMonth: String(s.dayOfMonth)
		}
	};
};

export const actions: Actions = {
	default: async ({ locals, request, url }) => {
		const userId = requireUser(locals).id;
		const r = await readRecurringForm(userId, await request.formData());
		if (r.failure) return r.failure;
		await createRecurring(userId, r.data);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
