import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import type { Actions } from './$types';
import { es } from '#lib/copy/es.ts';
import { parseCategoryForm } from '#lib/server/categories/form.ts';
import { createCategory, writeIfNameFree } from '#lib/server/categories/queries.ts';
import { requireUser } from '#lib/server/guards.ts';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const userId = requireUser(locals).id;
		const parsed = parseCategoryForm(await request.formData());
		if (!parsed.ok) return formFail(400, { values: parsed.values, errors: parsed.errors });

		const rows = await writeIfNameFree(userId, parsed.data.name, () =>
			createCategory(userId, parsed.data)
		);
		if (!rows)
			return formFail(400, {
				values: parsed.data,
				errors: { name: es.categories.errors.duplicateName }
			});
		redirect(303, `/categories/${rows[0].id}`);
	}
};
