import { fail, redirect } from '@sveltejs/kit';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import { accountActions } from '$lib/server/accounts';
import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import {
	DELETE_REFERENCED_MESSAGE,
	DUPLICATE_NAME_MESSAGE,
	KIND_LOCKED_MESSAGE,
	NOT_FOUND_MESSAGE,
	kindAllowed,
	parseCategoryForm,
	toCurrencyNets
} from '$lib/server/categories';
import {
	categoryMonthNet,
	categoryMovementTypes,
	categoryReferenced,
	deleteCategory,
	getCategory,
	setCategoryArchived,
	updateCategory,
	writeIfNameFree
} from '$lib/server/categories-queries';
import { currentMonth, monthLabel, monthRange, parseMonth } from '$lib/server/month';

const { notFound, requireId } = notFoundHelpers(NOT_FOUND_MESSAGE);

/** The only fields `?/update` takes. */
const EDITABLE = ['name', 'icon', 'color', 'kind'] as const;

/** The category as the detail shows it (what the load returns and `update` hands back). */
async function categoryOf(userId: string, id: string) {
	const [category] = await getCategory(userId, id);
	if (!category) notFound();
	const types = (await categoryMovementTypes(userId, id)).map((r) => r.type);
	// The saved kind stays selectable; every other blocked kind is disabled.
	const disabledKinds = (['outcome', 'income'] as const).filter(
		(k) => k !== category.kind && !kindAllowed(k, types)
	);
	const { archivedAt, ...rest } = category;
	return { category: { ...rest, archived: archivedAt !== null }, disabledKinds };
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const userId = locals.user!.id;
	requireId(params.id);
	const detail = await categoryOf(userId, params.id);

	const month = parseMonth(url.searchParams.get('month'), new Date());
	const [rows, referenced] = await Promise.all([
		categoryMonthNet(userId, params.id, monthRange(month)),
		categoryReferenced(userId, params.id)
	]);

	return {
		...detail,
		month: { label: monthLabel(month), isCurrent: month >= currentMonth(new Date()) },
		nets: toCurrencyNets(rows),
		actions: accountActions({
			referenced: referenced.length > 0,
			archived: detail.category.archived
		})
	};
};

const archiveAction =
	(archive: boolean): Actions[string] =>
	async ({ locals, params }) => {
		requireId(params.id);
		const rows = await setCategoryArchived(locals.user!.id, params.id, archive ? new Date() : null);
		if (rows.length === 0) notFound();
		return { done: true };
	};

export const actions: Actions = {
	/** Saves the posted subset of fields over the stored values, with the create form's validation. */
	update: async ({ locals, params, request }) => {
		const userId = locals.user!.id;
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
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

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
		return await categoryOf(userId, params.id);
	},
	archive: archiveAction(true),
	unarchive: archiveAction(false),
	delete: async ({ locals, params }) => {
		const userId = locals.user!.id;
		requireId(params.id);
		const referenced = () => fail(409, { error: DELETE_REFERENCED_MESSAGE });

		// Pre-check for the friendly error; ON DELETE RESTRICT still catches a movement added meanwhile.
		if ((await categoryReferenced(userId, params.id)).length > 0) return referenced();
		let rows;
		try {
			rows = await deleteCategory(userId, params.id);
		} catch (e) {
			if (pgErrorCode(e) === PG_FOREIGN_KEY_VIOLATION) return referenced();
			throw e;
		}
		if (rows.length === 0) notFound();
		redirect(303, '/categories');
	}
};
