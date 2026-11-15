import type { PageServerLoad } from './$types';
import { NAME_MAX_LENGTH } from '#lib/fields.ts';
import { CATEGORY_KINDS, KIND_LABEL } from '#lib/movement.ts';
import { listRowShown, matchesQuery, parseListFilter } from '#lib/list-filter.ts';
import {
	categoryMonthTotals,
	hasAnyCategory,
	listCategories
} from '#lib/server/categories/queries.ts';
import { currentMonth, monthRange } from '#lib/server/month.ts';
import { requireUser } from '#lib/server/guards.ts';

const KIND_GROUPS = [
	...CATEGORY_KINDS.map((k) => [k, KIND_LABEL[k]] as const),
	[null, 'Ambos'] as const
];

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	// ARS by default (like Home); `both` lists each currency's total, never summed.
	const { q, archived, currency } = parseListFilter(url.searchParams, {
		qMax: NAME_MAX_LENGTH,
		currencyDefault: 'ARS',
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

	// Month net (income - outcome) per category and currency, computed at read time.
	const nets = new Map<string, { ARS?: number; USD?: number }>();
	for (const t of totals) {
		const row = nets.get(t.categoryId!) ?? {};
		row[t.currency] = t.income - t.outcome;
		nets.set(t.categoryId!, row);
	}
	const withTotals = categories.map((c) => ({ ...c, totals: nets.get(c.id) ?? {} }));
	const sortBy = currency === 'both' ? 'ARS' : currency;
	const groups = KIND_GROUPS.map(([k, label]) => ({
		key: k ?? 'both',
		label,
		// Biggest month amount first (absolute net of the selected currency; Ambas sorts by pesos).
		categories: withTotals
			.filter((c) => c.kind === k)
			.sort(
				(a, b) =>
					Math.abs(b.totals[sortBy] ?? 0) - Math.abs(a.totals[sortBy] ?? 0) ||
					a.name.localeCompare(b.name)
			)
	})).filter((g) => g.categories.length > 0);

	return {
		filters: { q, archived, kind, currency },
		facets,
		hasAnyCategory: anyCategory.length > 0,
		groups
	};
};
