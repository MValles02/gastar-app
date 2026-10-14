import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import {
	DUPLICATE_NAME_MESSAGE,
	KIND_LOCKED_MESSAGE,
	NOT_FOUND_MESSAGE,
	kindAllowed,
	parseCategoryForm
} from '$lib/server/categories';
import {
	categoryMovementTypes,
	getCategory,
	updateCategory,
	writeIfNameFree
} from '$lib/server/categories-queries';

const { notFound, requireId } = notFoundHelpers(NOT_FOUND_MESSAGE);

export const load: PageServerLoad = async ({ locals, params }) => {
	requireId(params.id);
	const userId = locals.user!.id;
	const [category] = await getCategory(userId, params.id);
	if (!category) notFound();
	const types = (await categoryMovementTypes(userId, params.id)).map((r) => r.type);
	// The saved kind stays selectable; every other blocked kind is disabled in the form.
	const disabledKinds = (['outcome', 'income'] as const).filter(
		(k) => k !== category.kind && !kindAllowed(k, types)
	);
	return {
		id: category.id,
		disabledKinds,
		values: {
			name: category.name,
			color: category.color,
			icon: category.icon,
			kind: category.kind
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		requireId(params.id);
		const parsed = parseCategoryForm(await request.formData());
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const [current] = await getCategory(userId, params.id);
		if (!current) notFound();
		// Only a kind change is checked: a legacy category can still be renamed or recoloured.
		// ponytail: the check and the update are not atomic (unlikely race); wrap both in a transaction if it matters.
		if (parsed.data.kind !== current.kind) {
			const types = (await categoryMovementTypes(userId, params.id)).map((r) => r.type);
			if (!kindAllowed(parsed.data.kind, types))
				return fail(400, { values: parsed.data, errors: { kind: KIND_LOCKED_MESSAGE } });
		}
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
