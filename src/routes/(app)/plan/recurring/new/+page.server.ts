import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { planReturn } from '#lib/plan-wizard.ts';
import { createRecurring } from '#lib/server/recurring/queries.ts';
import { requireUser } from '#lib/server/guards.ts';
import { newRuleInitial, readRecurringForm } from '#lib/server/recurring/form.ts';
import { movementPickers } from '#lib/server/movements/pickers.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const type =
		url.searchParams.get('type') === 'income' ? ('income' as const) : ('outcome' as const);
	const pickers = await movementPickers(userId);
	return {
		...pickers,
		returnHref: planReturn(url.searchParams.get('wizard')),
		type,
		initial: await newRuleInitial(userId, {
			type,
			suggestionId: url.searchParams.get('suggestion'),
			accounts: pickers.accounts
		})
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
