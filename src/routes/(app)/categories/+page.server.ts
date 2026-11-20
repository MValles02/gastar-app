import type { PageServerLoad } from './$types';
import { NAME_MAX_LENGTH } from '#lib/fields.ts';
import { DEFAULT_CURRENCY } from '#lib/money.ts';
import { CATEGORY_KINDS } from '#lib/movement.ts';
import { listRowShown, matchesQuery, parseListFilter } from '#lib/list-filter.ts';
import {
	categoryMonthTotals,
	categoryGroups,
	hasAnyCategory,
	listCategories
} from '#lib/server/categories/queries.ts';
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

	// The drawer counts the staged choice client-side from these (every category, archived included).
	const facets = all.map((c) => ({
		kind: c.kind,
		archived: c.archivedAt !== null,
		match: matchesQuery(c.name, q)
	}));
	// Currency only changes which amounts a row shows, not which rows are listed.
	const categories = all.filter((_, i) => listRowShown(facets[i], { archived, kind }));

	const sortBy = currency === 'both' ? DEFAULT_CURRENCY : currency;
	const groups = categoryGroups(categories, totals, sortBy);

	return {
		filters: { q, archived, kind, currency },
		facets,
		hasAnyCategory: anyCategory.length > 0,
		groups
	};
};
