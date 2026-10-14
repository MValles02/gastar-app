import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { planReturn } from '$lib/plan-wizard';
import { createRecurring } from '$lib/server/plan-queries';
import { readRecurringForm, recurringPickers } from '../form.server';

export const load: PageServerLoad = async ({ locals, url }) => ({
	...(await recurringPickers(locals.user!.id)),
	returnHref: planReturn(url.searchParams.get('wizard')),
	type: url.searchParams.get('type') === 'income' ? ('income' as const) : ('outcome' as const)
});

export const actions: Actions = {
	default: async ({ locals, request, url }) => {
		const userId = locals.user!.id;
		const r = await readRecurringForm(userId, request);
		if (r.failure) return r.failure;
		await createRecurring(userId, r.data);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
