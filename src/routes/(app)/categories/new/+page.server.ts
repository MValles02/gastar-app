import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { DUPLICATE_NAME_MESSAGE, parseCategoryForm } from '$lib/server/categories';
import { createCategory, writeIfNameFree } from '$lib/server/categories-queries';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const parsed = parseCategoryForm(await request.formData());
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const rows = await writeIfNameFree(userId, parsed.data.name, () =>
			createCategory(userId, parsed.data)
		);
		if (!rows) return fail(400, { values: parsed.data, errors: { name: DUPLICATE_NAME_MESSAGE } });
		redirect(303, `/categories/${rows[0].id}`);
	}
};
