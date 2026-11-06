import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import type { Actions } from './$types';
import { parseAccountForm } from '$lib/server/accounts';
import { createAccount } from '$lib/server/accounts-queries';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const parsed = parseAccountForm(await request.formData(), 'create');
		if (!parsed.ok) return formFail(400, { values: parsed.values, errors: parsed.errors });
		const [row] = await createAccount(locals.user!.id, {
			...parsed.data,
			currency: parsed.data.currency!
		});
		redirect(303, `/accounts/${row.id}`);
	}
};
