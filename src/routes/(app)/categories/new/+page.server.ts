import { fail, redirect } from '@sveltejs/kit';
import { pgErrorCode } from '$lib/server/db/errors';
import type { Actions } from './$types';
import { DUPLICATE_NAME_MESSAGE, parseCategoryForm } from '$lib/server/categories';
import { categoryNameTaken, createCategory } from '$lib/server/categories-queries';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const parsed = parseCategoryForm(await request.formData());
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });
		const duplicate = () =>
			fail(400, { values: parsed.data, errors: { name: DUPLICATE_NAME_MESSAGE } });

		if ((await categoryNameTaken(userId, parsed.data.name)).length > 0) return duplicate();
		let row;
		try {
			[row] = await createCategory(userId, parsed.data);
		} catch (e) {
			const code = pgErrorCode(e);
			if (code === '23505') return duplicate();
			throw e;
		}
		redirect(303, `/categories/${row.id}`);
	}
};
