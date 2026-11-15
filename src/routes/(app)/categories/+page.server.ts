import type { PageServerLoad } from './$types';
import { NAME_MAX_LENGTH } from '$lib/fields';
import { CATEGORY_KINDS, KIND_LABEL, kindFits } from '$lib/movement';
import { CURRENCIES, type Currency } from '$lib/money';
import {
	categoryMonthTotals,
	hasAnyCategory,
	listCategories
} from '$lib/server/categories/queries';
import { currentMonth, monthRange } from '$lib/server/month';
import { requireUser } from '$lib/server/guards';

const KIND_GROUPS = [
	...CATEGORY_KINDS.map((k) => [k, KIND_LABEL[k]] as const),
	[null, 'Ambos'] as const
];

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, NAME_MAX_LENGTH);
	const archived = url.searchParams.get('archived') === '1';
	const kind = CATEGORY_KINDS.find((k) => k === url.searchParams.get('kind')) ?? '';
	// ARS by default (like Home); `both` lists each currency's total, never summed.
	const param = url.searchParams.get('currency');
	const currency: Currency | 'both' =
		param === 'both' ? 'both' : (CURRENCIES.find((c) => c === param) ?? 'ARS');

	const [anyCategory, all, totals] = await Promise.all([
		hasAnyCategory(userId),
		listCategories(userId, { archived: true }),
		categoryMonthTotals(userId, monthRange(currentMonth(new Date())))
	]);

	// The drawer counts the staged choice client-side from these (every category, archived included).
	const matches = (name: string) => name.toLowerCase().includes(q.toLowerCase());
	const facets = all.map((c) => ({
		kind: c.kind,
		archived: c.archivedAt !== null,
		match: matches(c.name)
	}));
	const categories = all.filter(
		(c) =>
			(archived || c.archivedAt === null) && (!kind || kindFits(c.kind, kind)) && matches(c.name)
	);

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
