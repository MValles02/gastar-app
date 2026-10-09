import { fail, redirect } from '@sveltejs/kit';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from '$lib/server/db/errors';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import { accountActions } from '$lib/server/accounts';
import {
	DELETE_REFERENCED_MESSAGE,
	NOT_FOUND_MESSAGE,
	toCurrencyNets
} from '$lib/server/categories';
import {
	categoryMonthNet,
	categoryReferenced,
	deleteCategory,
	getCategory,
	setCategoryArchived
} from '$lib/server/categories-queries';
import { currentMonth, monthLabel, monthRange, parseMonth, shiftMonth } from '$lib/server/month';

const { notFound, requireId } = notFoundHelpers(NOT_FOUND_MESSAGE);

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const userId = locals.user!.id;
	requireId(params.id);
	const [category] = await getCategory(userId, params.id);
	if (!category) notFound();

	const now = new Date();
	const month = parseMonth(url.searchParams.get('month'), now);
	const [rows, referenced] = await Promise.all([
		categoryMonthNet(userId, category.id, monthRange(month)),
		categoryReferenced(userId, category.id)
	]);
	const { archivedAt, ...rest } = category;
	const archived = archivedAt !== null;

	return {
		category: { ...rest, archived },
		month: {
			label: monthLabel(month),
			prev: shiftMonth(month, -1),
			next: shiftMonth(month, 1),
			isCurrent: month >= currentMonth(now)
		},
		nets: toCurrencyNets(rows),
		actions: accountActions({ referenced: referenced.length > 0, archived })
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
