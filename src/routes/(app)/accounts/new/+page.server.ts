import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import type { Actions } from './$types';
import { parseAccountForm } from '#lib/server/accounts/form.ts';
import { createAccount } from '#lib/server/accounts/queries.ts';
import { requireUser } from '#lib/server/guards.ts';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const parsed = parseAccountForm(await request.formData(), 'create');
		if (!parsed.ok) return formFail(400, { values: parsed.values, errors: parsed.errors });
		const [row] = await createAccount(requireUser(locals).id, parsed.data);
		redirect(303, `/accounts/${row.id}`);
	}
};
