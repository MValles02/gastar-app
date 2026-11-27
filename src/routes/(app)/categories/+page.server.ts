import type { PageServerLoad } from './$types';
import { NAME_MAX_LENGTH } from '#lib/constants.ts';
import { DEFAULT_CURRENCY } from '#lib/money.ts';
import { CATEGORY_KINDS } from '#lib/movement.ts';
import { parseListFilter } from '#lib/list-filter.ts';
import {
	categoryMonthTotals,
	hasAnyCategory,
	listCategories
} from '#lib/server/categories/queries.ts';
import { categoryList } from '#lib/server/categories/view.ts';
import { currentMonth, monthRange } from '#lib/server/month.ts';
import { requireUser } from '#lib/server/guards.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	// ARS by default (like Home); `both` lists each currency's total, never summed.
	const { q, archived, currency } = parseListFilter(url.searchParams, {
		qMax: NAME_MAX_LENGTH,
		currencyDefault: DEFAULT_CURRENCY,
		extra: ['both']
	});
	const kind = CATEGORY_KINDS.find((k) => k === url.searchParams.get('kind')) ?? '';

	const [anyCategory, all, totals] = await Promise.all([
		hasAnyCategory(userId),
		listCategories(userId, { archived: true }),
		categoryMonthTotals(userId, monthRange(currentMonth(new Date())))
	]);

	const { facets, groups } = categoryList(all, totals, { q, archived, kind, currency });

	return {
		filters: { q, archived, kind, currency },
		facets,
		hasAnyCategory: anyCategory.length > 0,
		groups
	};
};
