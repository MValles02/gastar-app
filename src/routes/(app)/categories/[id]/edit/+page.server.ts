import { error, fail, redirect } from '@sveltejs/kit';
import { PG_UNIQUE_VIOLATION, pgErrorCode } from '$lib/server/db/errors';
import type { Actions, PageServerLoad } from './$types';
import { isUuid } from '$lib/server/db/util';
import { DUPLICATE_NAME_MESSAGE, parseCategoryForm } from '$lib/server/categories';
import { categoryNameTaken, getCategory, updateCategory } from '$lib/server/categories-queries';

const notFound = () => error(404, 'Categoría no encontrada.');

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id)) notFound();
	const [category] = await getCategory(locals.user!.id, params.id);
	if (!category) notFound();
	return {
		id: category.id,
		values: { name: category.name, color: category.color }
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		if (!isUuid(params.id)) notFound();
		const parsed = parseCategoryForm(await request.formData());
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });
		const duplicate = () =>
			fail(400, { values: parsed.data, errors: { name: DUPLICATE_NAME_MESSAGE } });

		if ((await getCategory(userId, params.id)).length === 0) notFound();
		if ((await categoryNameTaken(userId, parsed.data.name, params.id)).length > 0)
			return duplicate();

		let rows;
		try {
			rows = await updateCategory(userId, params.id, parsed.data);
		} catch (e) {
			const code = pgErrorCode(e);
			if (code === PG_UNIQUE_VIOLATION) return duplicate();
			throw e;
		}
		if (rows.length === 0) notFound();
		redirect(303, `/categories/${params.id}`);
	}
};
