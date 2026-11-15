import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import {
	DELETE_REFERENCED_MESSAGE,
	DUPLICATE_NAME_MESSAGE,
	editedForm,
	KIND_LOCKED_MESSAGE,
	NOT_FOUND_MESSAGE,
	parseCategoryForm,
	toFormValues
} from '#lib/server/categories/form.ts';
import {
	categoryMonthNet,
	categoryMovementTypes,
	deleteCategory,
	getCategory,
	isCategoryReferenced,
	setCategoryArchived,
	toCurrencyNets,
	updateCategory,
	writeIfNameFree
} from '#lib/server/categories/queries.ts';
import { archiveActions, deleteUnlessReferenced, lifecycleState } from '#lib/server/lifecycle.ts';
import { monthNav, monthParam, monthRange } from '#lib/server/month.ts';
import { notFoundHelpers, requireUser } from '#lib/server/guards.ts';
import { CATEGORY_KINDS, kindFits } from '#lib/movement.ts';

const guards = notFoundHelpers(NOT_FOUND_MESSAGE);
const { notFound, requireId } = guards;

/** The category as the detail shows it (what the load returns and `update` hands back). */
async function categoryOf(userId: string, id: string) {
	const [category] = await getCategory(userId, id);
	if (!category) notFound();
	const types = (await categoryMovementTypes(userId, id)).map((r) => r.type);
	// A kind is allowed only when every movement fits it; the saved kind stays selectable, every other blocked kind is disabled.
	const disabledKinds = CATEGORY_KINDS.filter(
		(k) => k !== category.kind && !types.every((t) => kindFits(k, t))
	);
	const { archivedAt, ...rest } = category;
	return { category: { ...rest, archived: archivedAt !== null }, disabledKinds };
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const userId = requireUser(locals).id;
	requireId(params.id);
	const detail = await categoryOf(userId, params.id);

	// Any month, future ones included.
	const month = monthParam(url, { clamp: false });
	const nav = monthNav(month);
	const [rows, referenced] = await Promise.all([
		categoryMonthNet(userId, params.id, monthRange(month)),
		isCategoryReferenced(userId, params.id)
	]);

	return {
		...detail,
		values: toFormValues(detail.category),
		month: { label: nav.label, isCurrent: nav.isCurrent },
		nets: toCurrencyNets(rows),
		actions: lifecycleState({ referenced, archived: detail.category.archived })
	};
};

export const actions: Actions = {
	/** Saves the posted subset of fields over the stored values, with the create form's validation. */
	update: async ({ locals, params, request }) => {
		const userId = requireUser(locals).id;
		requireId(params.id);
		const { category: current } = await categoryOf(userId, params.id);
		const posted = await request.formData();
		const parsed = parseCategoryForm(editedForm(current, posted));
		if (!parsed.ok) return formFail(400, { values: parsed.values, errors: parsed.errors });

		// Only a kind change is checked: a legacy category can still be renamed or recoloured.
		// ponytail: the check and the update are not atomic (unlikely race); wrap both in a transaction if it matters.
		if (parsed.data.kind !== current.kind) {
			const types = (await categoryMovementTypes(userId, params.id)).map((r) => r.type);
			if (!types.every((t) => kindFits(parsed.data.kind, t)))
				return formFail(400, { values: parsed.data, errors: { kind: KIND_LOCKED_MESSAGE } });
		}
		const rows = await writeIfNameFree(
			userId,
			parsed.data.name,
			() => updateCategory(userId, params.id, parsed.data),
			params.id
		);
		if (!rows)
			return formFail(400, { values: parsed.data, errors: { name: DUPLICATE_NAME_MESSAGE } });
		if (rows.length === 0) notFound();
		return await categoryOf(userId, params.id);
	},
	...archiveActions(setCategoryArchived, guards),
	delete: deleteUnlessReferenced(
		{
			isReferenced: isCategoryReferenced,
			remove: deleteCategory,
			message: DELETE_REFERENCED_MESSAGE,
			redirectTo: '/categories'
		},
		guards
	)
};
