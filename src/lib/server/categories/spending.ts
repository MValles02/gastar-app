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
