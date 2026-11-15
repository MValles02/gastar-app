import { formFail } from '$lib/form';
import type { Actions, PageServerLoad } from './$types';
import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import {
	DELETE_REFERENCED_MESSAGE,
	DUPLICATE_NAME_MESSAGE,
	EDITABLE,
	KIND_LOCKED_MESSAGE,
	NOT_FOUND_MESSAGE,
	parseCategoryForm
} from '$lib/server/categories/form';
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
} from '$lib/server/categories/queries';
import { archiveActions, deleteUnlessReferenced, lifecycleState } from '$lib/server/lifecycle';
import { currentMonth, monthLabel, monthRange, parseMonth } from '$lib/server/month';
import { notFoundHelpers, requireUser } from '$lib/server/guards';
import { CATEGORY_KINDS, kindFits } from '$lib/movement';

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

	const month = parseMonth(url.searchParams.get('month'), new Date());
	const [rows, referenced] = await Promise.all([
		categoryMonthNet(userId, params.id, monthRange(month)),
		isCategoryReferenced(userId, params.id)
	]);

	return {
		...detail,
		month: { label: monthLabel(month), isCurrent: month >= currentMonth(new Date()) },
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
		const fd = new FormData();
		fd.set('name', current.name);
		fd.set('icon', toCategoryIconKey(current.icon) ?? '');
		fd.set('color', toSwatchKey(current.color) ?? 'green');
		fd.set('kind', current.kind ?? '');
		for (const k of EDITABLE) {
			const v = posted.get(k);
			if (typeof v === 'string') fd.set(k, v);
		}
		const parsed = parseCategoryForm(fd);
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
