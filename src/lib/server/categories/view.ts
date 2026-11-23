import { CURRENCIES, DEFAULT_CURRENCY, type Currency } from '#lib/money.ts';
import { CATEGORY_KINDS, KIND_LABEL, type CategoryKind } from '#lib/movement.ts';
import { listRowShown, matchesQuery } from '#lib/list-filter.ts';

/** Net per currency (outcomes minus incomes) from categoryMonthNet rows, ARS first. Never sums across currencies. */
export function toCurrencyNets(
	rows: { currency: Currency; outcome: number; income: number }[]
): { currency: Currency; net: number }[] {
	return rows
		.map((r) => ({ currency: r.currency, net: r.outcome - r.income }))
		.sort((a, b) => CURRENCIES.indexOf(a.currency) - CURRENCIES.indexOf(b.currency));
}

const KIND_GROUPS = [
	...CATEGORY_KINDS.map((k) => [k, KIND_LABEL[k]] as const),
	[null, 'Ambos'] as const
];

/** Categories grouped by kind, each group sorted by the biggest month amount in `sortBy`. */
export function categoryGroups<C extends { id: string; name: string; kind: CategoryKind | null }>(
	categories: C[],
	totals: { categoryId: string | null; currency: Currency; outcome: number; income: number }[],
	sortBy: Currency
) {
	// Month net (income - outcome) per category and currency, computed at read time.
	const nets = new Map<string, Partial<Record<Currency, number>>>();
	for (const t of totals) {
		const row = nets.get(t.categoryId!) ?? {};
		row[t.currency] = t.income - t.outcome;
		nets.set(t.categoryId!, row);
	}
	const withTotals = categories.map((c) => ({ ...c, totals: nets.get(c.id) ?? {} }));
	return KIND_GROUPS.map(([k, label]) => ({
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
}

/** The list's drawer facets and the kind groups of the rows that pass the filters. */
export function categoryList<
	C extends { id: string; name: string; kind: CategoryKind | null; archivedAt: Date | null }
>(
	all: C[],
	totals: { categoryId: string | null; currency: Currency; outcome: number; income: number }[],
	{
		q,
		archived,
		kind,
		currency
	}: { q: string; archived: boolean; kind: CategoryKind | ''; currency: Currency | 'both' }
) {
	// The drawer counts the staged choice client-side from these (every category, archived included).
	const facets = all.map((c) => ({
		kind: c.kind,
		archived: c.archivedAt !== null,
		match: matchesQuery(c.name, q)
	}));
	// Currency only changes which amounts a row shows, not which rows are listed.
	const categories = all.filter((_, i) => listRowShown(facets[i], { archived, kind }));

	const sortBy = currency === 'both' ? DEFAULT_CURRENCY : currency;
	return { facets, groups: categoryGroups(categories, totals, sortBy) };
}
