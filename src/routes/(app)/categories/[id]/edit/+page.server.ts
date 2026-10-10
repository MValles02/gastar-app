import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import {
	DUPLICATE_NAME_MESSAGE,
	NOT_FOUND_MESSAGE,
	parseCategoryForm
} from '$lib/server/categories';
import { getCategory, updateCategory, writeIfNameFree } from '$lib/server/categories-queries';

const { notFound, requireId } = notFoundHelpers(NOT_FOUND_MESSAGE);

export const load: PageServerLoad = async ({ locals, params }) => {
	requireId(params.id);
	const [category] = await getCategory(locals.user!.id, params.id);
	if (!category) notFound();
	return {
		id: category.id,
		values: { name: category.name, color: category.color, kind: category.kind }
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		requireId(params.id);
		const parsed = parseCategoryForm(await request.formData());
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		if ((await getCategory(userId, params.id)).length === 0) notFound();
		const rows = await writeIfNameFree(
			userId,
			parsed.data.name,
			() => updateCategory(userId, params.id, parsed.data),
			params.id
		);
		if (!rows) return fail(400, { values: parsed.data, errors: { name: DUPLICATE_NAME_MESSAGE } });
		if (rows.length === 0) notFound();
		redirect(303, `/categories/${params.id}`);
	}
};
