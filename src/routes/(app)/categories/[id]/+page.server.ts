import { error, fail, redirect } from '@sveltejs/kit';
import { pgErrorCode } from '$lib/server/db/errors';
import type { Actions, PageServerLoad } from './$types';
import { accountActions } from '$lib/server/accounts';
import { isUuid } from '$lib/server/db/util';
import { DELETE_REFERENCED_MESSAGE, toCurrencyNets } from '$lib/server/categories';
import {
	categoryMonthNet,
	categoryReferenced,
	deleteCategory,
	getCategory,
	setCategoryArchived
} from '$lib/server/categories-queries';
import { currentMonth, monthLabel, monthRange } from '$lib/server/month';

const notFound = () => error(404, 'Categoría no encontrada.');

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	if (!isUuid(params.id)) notFound();
	const [category] = await getCategory(userId, params.id);
	if (!category) notFound();

	const month = currentMonth(new Date());
	const [rows, referenced] = await Promise.all([
		categoryMonthNet(userId, category.id, monthRange(month)),
		categoryReferenced(userId, category.id)
	]);
	const { archivedAt, ...rest } = category;
	const archived = archivedAt !== null;

	return {
		category: { ...rest, archived },
		monthLabel: monthLabel(month),
		nets: toCurrencyNets(rows),
		actions: accountActions({ referenced: referenced.length > 0, archived })
	};
};

const archiveAction =
	(archive: boolean): Actions[string] =>
	async ({ locals, params }) => {
		if (!isUuid(params.id)) notFound();
		const rows = await setCategoryArchived(locals.user!.id, params.id, archive ? new Date() : null);
		if (rows.length === 0) notFound();
		return { done: true };
	};

export const actions: Actions = {
	archive: archiveAction(true),
	unarchive: archiveAction(false),
	delete: async ({ locals, params }) => {
		const userId = locals.user!.id;
		if (!isUuid(params.id)) notFound();
		if ((await categoryReferenced(userId, params.id)).length > 0)
			return fail(409, { error: DELETE_REFERENCED_MESSAGE });
		let rows;
		try {
			rows = await deleteCategory(userId, params.id);
		} catch (e) {
			const code = pgErrorCode(e);
			if (code === '23503') return fail(409, { error: DELETE_REFERENCED_MESSAGE });
			throw e;
		}
		if (rows.length === 0) notFound();
		redirect(303, '/categories');
	}
};
