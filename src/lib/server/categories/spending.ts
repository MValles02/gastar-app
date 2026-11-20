import { categoryLook, type CategoryIconKey } from '#lib/appearance.ts';

/**
 * Net spending per category (outcome − income, integer cents): the categories that spent, biggest
 * first (ties by name, Spanish collation), the first `top` of them, what the others add up to, and
 * the total over all of them.
 */
export function rankSpending<R extends { name: string; outcome: number; income: number }>(
	rows: R[],
	top: number
) {
	const spent = rows
		.map((r) => ({ ...r, net: r.outcome - r.income }))
		.filter((r) => r.net > 0)
		.sort((a, b) => b.net - a.net || a.name.localeCompare(b.name, 'es'));
	const total = spent.reduce((a, r) => a + r.net, 0);
	const rest = spent.slice(top).reduce((a, r) => a + r.net, 0);
	return { top: spent.slice(0, top), rest, total };
}

type CategorySum = {
	id: string;
	name: string;
	color: string | null;
	icon: string | null;
	outcome: number;
	income: number;
};

/** Net spending per category (integer cents), the top `top` categories plus "Otros". */
export function categorySlices(cats: CategorySum[], top: number) {
	const { top: ranked, rest, total: totalSpent } = rankSpending(cats, top);
	const slices = ranked.map((c) => {
		const look = categoryLook(c);
		return {
			id: c.id,
			name: c.name,
			color: look.color,
			icon: look.icon as CategoryIconKey | null,
			amount: c.net
		};
	});
	if (rest > 0) slices.push({ id: 'other', name: 'Otros', color: null, icon: null, amount: rest });

	const percents = wholePercents(
		slices.map((s) => s.amount),
		totalSpent
	);
	return slices.map((s, i) => ({ ...s, percent: percents[i] }));
}

/** Largest-remainder rounding on integer cents so the shown percentages sum to 100. */
function wholePercents(amounts: number[], total: number): number[] {
	const percents = amounts.map((a) => Math.floor((a * 100) / total));
	let left = amounts.length > 0 ? 100 - percents.reduce((a, p) => a + p, 0) : 0;
	[...amounts.keys()]
		.sort((i, j) => ((amounts[j] * 100) % total) - ((amounts[i] * 100) % total) || i - j)
		.forEach((i) => {
			if (left-- > 0) percents[i]++;
		});
	return percents;
}
