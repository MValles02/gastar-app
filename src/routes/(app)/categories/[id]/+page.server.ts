import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import {
	DELETE_REFERENCED_MESSAGE,
	DUPLICATE_NAME_MESSAGE,
	editedForm,
	KIND_LOCKED_MESSAGE,
	NOT_FOUND_MESSAGE,
	parseCategoryForm
} from '#lib/server/categories/form.ts';
import {
	categoryMonthNet,
	deleteCategory,
	getCategory,
	isCategoryReferenced,
	kindLock,
	setCategoryArchived,
	updateCategoryChecked,
	writeIfNameFree
} from '#lib/server/categories/queries.ts';
import { toCurrencyNets } from '#lib/server/categories/view.ts';
import { archiveActions, deleteUnlessReferenced, lifecycleState } from '#lib/server/lifecycle.ts';
import { monthLabel, monthParam, monthRange } from '#lib/server/month.ts';
import { notFoundHelpers, requireUser } from '#lib/server/guards.ts';
import { CATEGORY_KINDS } from '#lib/movement.ts';

const guards = notFoundHelpers(NOT_FOUND_MESSAGE);
const { notFound, requireId } = guards;

/** The category as the detail shows it (what the load returns and `update` hands back). */
async function categoryOf(userId: string, id: string) {
	const [category] = await getCategory(userId, id);
	if (!category) notFound();
	const fits = await kindLock(userId, id);
	// A kind is allowed only when every movement fits it; the saved kind stays selectable, every other blocked kind is disabled.
	const disabledKinds = CATEGORY_KINDS.filter((k) => k !== category.kind && !fits(k));
	const { archivedAt, ...rest } = category;
	return { category: { ...rest, archived: archivedAt !== null }, disabledKinds };
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const userId = requireUser(locals).id;
	requireId(params.id);
	const detail = await categoryOf(userId, params.id);

	const month = monthParam(url, { clamp: false });
	const [rows, referenced] = await Promise.all([
		categoryMonthNet(userId, params.id, monthRange(month)),
		isCategoryReferenced(userId, params.id)
	]);

	return {
		...detail,
		month: { label: monthLabel(month) },
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
		const rows = await writeIfNameFree(
			userId,
			parsed.data.name,
			() =>
				updateCategoryChecked(userId, params.id, parsed.data, parsed.data.kind !== current.kind),
			params.id
		);
		if (!rows)
			return formFail(400, { values: parsed.data, errors: { name: DUPLICATE_NAME_MESSAGE } });
		if (rows === 'kind-locked')
			return formFail(400, { values: parsed.data, errors: { kind: KIND_LOCKED_MESSAGE } });
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
