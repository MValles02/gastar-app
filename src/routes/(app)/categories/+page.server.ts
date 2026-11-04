import type { PageServerLoad } from './$types';
import { NAME_MAX_LENGTH } from '$lib/limits';
import { CURRENCIES, type Currency } from '$lib/money';
import {
	categoryMonthTotals,
	hasAnyCategory,
	listCategories
} from '$lib/server/categories-queries';
import { currentMonth, monthRange } from '$lib/server/month';

const KIND_GROUPS = [
	['outcome', 'Gastos'],
	['income', 'Ingresos'],
	[null, 'Ambos']
] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, NAME_MAX_LENGTH);
	const archived = url.searchParams.get('archived') === '1';
	const kind =
		(['outcome', 'income'] as const).find((k) => k === url.searchParams.get('kind')) ?? '';
	// ARS by default (like Home); `both` lists each currency's total, never summed.
	const param = url.searchParams.get('currency');
	const currency: Currency | 'both' =
		param === 'both' ? 'both' : (CURRENCIES.find((c) => c === param) ?? 'ARS');

	const [anyCategory, categories, totals] = await Promise.all([
		hasAnyCategory(userId),
		listCategories(userId, { q, archived, kind: kind || undefined }),
		categoryMonthTotals(userId, monthRange(currentMonth(new Date())))
	]);

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
		hasAnyCategory: anyCategory.length > 0,
		groups
	};
};
